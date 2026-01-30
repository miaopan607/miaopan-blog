import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 1219;

app.use(cors());
app.use(express.json());

const MUSIC_DATA_DIR = path.join(__dirname, 'music-data');

if (!fs.existsSync(MUSIC_DATA_DIR)) {
    fs.mkdirSync(MUSIC_DATA_DIR, { recursive: true });
}

app.get('/api/today-music', (req, res) => {
    // 1. 获取今天的日期字符串 (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');
    
    try {
        // 2. 读取目录下所有文件
        const files = fs.readdirSync(MUSIC_DATA_DIR);
        
        // 3. 过滤出 .md 文件，并按日期倒序排列（最新的在前面）
        const sortedFiles = files
            .filter(file => file.endsWith('.md'))
            .sort((a, b) => b.localeCompare(a));

        // 4. 找到不晚于今天的最新文件
        // 比如今天 2023-10-27，如果列表有 [2023-10-28, 2023-10-25, 2023-10-20]
        // 它会跳过 28 号，选择 25 号。
        const targetFile = sortedFiles.find(file => file.replace('.md', '') <= today);

        if (targetFile) {
            const filePath = path.join(MUSIC_DATA_DIR, targetFile);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const { data, content } = matter(fileContent);
            const actualDate = targetFile.replace('.md', '');

            res.json({
                success: true,
                date: actualDate, // 返回实际找到的日期
                isToday: actualDate === today, // 告诉前端这是不是今天的
                musicId: data.id || "101126",
                title: data.title || "今日推荐",
                content: content
            });
        } else {
            // 5. 如果连以前的文件都没有，返回 404
            res.status(404).json({
                success: false,
                message: "No history music found",
                date: today,
                musicId: "101126",
                title: "暂无推荐",
                content: "库里还没有任何音乐推荐哦~"
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Music Backend is running at http://localhost:${PORT}`);
});