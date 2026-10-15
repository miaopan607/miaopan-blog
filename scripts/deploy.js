import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const configFile = new URL("../deploy.config.json", import.meta.url);

function run(command, args) {
	const result = spawnSync(command, args, {
		cwd: projectRoot,
		stdio: "inherit",
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(
			`${command} 执行失败（${result.signal ?? `退出码 ${result.status}`}）`,
		);
	}
}

function quoteShell(value) {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

try {
	const { values } = parseArgs({
		options: {
			"dry-run": { type: "boolean", default: false },
			help: { type: "boolean", short: "h", default: false },
		},
	});

	if (values.help) {
		console.log(`用法：pnpm run deploy [--dry-run]

先将 deploy.config.example.json 复制为 deploy.config.json，填写 host 和 path。
依赖本地 pnpm、SSH、rsync，以及远端 rsync；SSH 端口和密钥在 ~/.ssh/config 配置。
--dry-run  构建并预览同步内容，不修改远端文件。`);
	} else {
		if (!existsSync(configFile)) {
			throw new Error(
				"缺少 deploy.config.json，请先复制 deploy.config.example.json 并填写部署目标。",
			);
		}
		const config = JSON.parse(readFileSync(configFile, "utf8"));
		if (
			typeof config.host !== "string" ||
			!config.host.trim() ||
			typeof config.path !== "string" ||
			!config.path.trim()
		) {
			throw new Error("deploy.config.json 必须填写 host 和 path。");
		}

		const host = config.host.trim();
		const remotePath = posix.normalize(config.path.trim());
		if (!posix.isAbsolute(remotePath) || remotePath === "/") {
			throw new Error("path 必须是专用于博客的绝对目录，不能是根目录。");
		}

		console.log("正在构建站点和 Pagefind 搜索索引……");
		run("pnpm", ["run", "build"]);

		if (!values["dry-run"]) {
			run("ssh", ["--", host, `mkdir -p -- ${quoteShell(remotePath)}`]);
		}

		console.log(`同步目标：${host}:${remotePath}/`);
		// 延后替换和删除文件，减少同步期间的页面缺失。
		run("rsync", [
			"-az",
			"--protect-args",
			"--delay-updates",
			"--delete-delay",
			"--itemize-changes",
			"-e",
			"ssh",
			...(values["dry-run"] ? ["--dry-run"] : []),
			"--",
			"dist/",
			`${host}:${remotePath.replace(/\/$/, "")}/`,
		]);
		console.log(
			values["dry-run"] ? "部署预览完成，远端文件未修改。" : "部署完成。",
		);
	}
} catch (error) {
	console.error(`部署失败：${error.message}`);
	process.exitCode = 1;
}
