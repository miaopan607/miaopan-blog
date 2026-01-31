import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const MUSIC_DATA_DIR = path.join(__dirname, 'music-data');
const CACHE_FILE = path.join(__dirname, 'music-cache.json');

if (!fs.existsSync(MUSIC_DATA_DIR)) {
    fs.mkdirSync(MUSIC_DATA_DIR, { recursive: true });
}

// --- 缓存逻辑 ---
let musicCache = {};

function loadCache() {
    if (fs.existsSync(CACHE_FILE)) {
        try {
            const data = fs.readFileSync(CACHE_FILE, 'utf-8');
            musicCache = JSON.parse(data);
            console.log(`[Cache] Loaded ${Object.keys(musicCache).length} cached songs.`);
        } catch (e) {
            console.error("[Cache] Failed to load music cache:", e);
            musicCache = {};
        }
    }
}

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(musicCache, null, 2), 'utf-8');
    } catch (e) {
        console.error("[Cache] Failed to save music cache:", e);
    }
}

// 初始加载缓存
loadCache();

function getFromCache(type, id) {
    const key = `${type}:${id}`;
    return musicCache[key] || null;
}

function setToCache(type, id, data) {
    const key = `${type}:${id}`;
    // 限制缓存数量，虽然用户说不会超过 5000，但做个保险
    if (Object.keys(musicCache).length >= 10000) {
        const firstKey = Object.keys(musicCache)[0];
        delete musicCache[firstKey];
    }
    musicCache[key] = data;
    saveCache();
}

// 辅助函数：统一处理音乐文件的解析和元数据获取
async function getMusicResponse(targetFile, dateStr, isToday) {
    const filePath = path.join(MUSIC_DATA_DIR, targetFile);
    if (!fs.existsSync(filePath)) return null;

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const actualDate = targetFile.replace('.md', '');

    let finalResponse = {
        success: true,
        date: actualDate,
        isToday: isToday,
        musicId: "",
        name: "",
        artists: [],
        musicUrl: "",
        cover: "",
        content: content,
        type: 'none'
    };

    let musicId = data.id;
    let musicType = data.type ? data.type.toLowerCase() : 'netease';
    
    // 统一别名
    if (musicType === '163') musicType = 'netease';

    console.log(`Music routing: Type=${musicType}, ID=${musicId}`);

    // 检查缓存
    if (musicId) {
        const cachedMusic = getFromCache(musicType, musicId);
        if (cachedMusic) {
            console.log(`[Cache] Hit for ${musicType}:${musicId}`);
            Object.assign(finalResponse, cachedMusic);
            return finalResponse;
        }
    }

    if (musicType === 'qq' && musicId) {
        // --- QQ 音乐处理逻辑 ---
        try {
            let qqMusicData = null;
            
            // 判断 ID 是链接还是普通 ID
            if (musicId.toString().startsWith('http')) {
                qqMusicData = await getQQMusicMetadataFromLink(musicId);
            } else {
                qqMusicData = await getQQMusicMetadataFromId(musicId);
            }

            if (qqMusicData) {
                const playUrl = await getQQMusicPlayUrl(qqMusicData.mid, qqMusicData.mediaId);
                const musicInfo = {
                    musicId: qqMusicData.mid,
                    name: qqMusicData.name,
                    artists: qqMusicData.artists,
                    musicUrl: playUrl || "",
                    cover: qqMusicData.cover,
                    type: 'qq'
                };

                // 写入缓存
                setToCache(musicType, musicId, musicInfo);
                Object.assign(finalResponse, musicInfo);
                return finalResponse;
            }
        } catch (e) {
            console.error("QQ Music Parse Error:", e);
        }
    } else if (musicType === 'netease' && musicId) {
        // --- 网易云音乐处理逻辑 ---
        try {
            const neteaseData = await getNeteaseMusicMetadata(musicId);
            if (neteaseData) {
                const musicInfo = {
                    musicId: neteaseData.id,
                    name: neteaseData.name,
                    artists: neteaseData.artists,
                    // 使用直链解析，不再依赖复杂的 API
                    // 格式: https://music.163.com/song/media/outer/url?id=ID.mp3
                    musicUrl: `https://music.163.com/song/media/outer/url?id=${neteaseData.id}.mp3`,
                    cover: neteaseData.cover,
                    type: 'netease'
                };

                // 写入缓存
                setToCache(musicType, musicId, musicInfo);
                Object.assign(finalResponse, musicInfo);
                return finalResponse;
            }
        } catch (e) {
            console.error("Netease Music Parse Error:", e);
        }
    }

    // 兜底返回
    console.log("Music parsing failed or incomplete config, returning content only.");
    return finalResponse;
}

app.get('/api/today-music', async (req, res) => {
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

        // 3. 过滤出 .md 文件，并按日期倒序排列
        const sortedFiles = files
            .filter(file => file.endsWith('.md'))
            .sort((a, b) => b.localeCompare(a));

        // 4. 找到不晚于今天的最新文件
        const targetFile = sortedFiles.find(file => file.replace('.md', '') <= today);

        if (targetFile) {
            const actualDate = targetFile.replace('.md', '');
            const response = await getMusicResponse(targetFile, today, actualDate === today);
            res.json(response);
        } else {
            res.status(404).json({
                success: false,
                title: "暂无推荐",
                content: "暂无推荐"
            });
        }
    } catch (error) {
        console.error("Music API Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.get('/api/tomorrow-music', async (req, res) => {
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');

    try {
        const targetFile = tomorrow + '.md';
        const filePath = path.join(MUSIC_DATA_DIR, targetFile);

        if (fs.existsSync(filePath)) {
            const response = await getMusicResponse(targetFile, tomorrow, false);
            res.json(response);
        } else {
            res.json({
                success: false,
                title: "未找到明天的推荐",
                content: "还没准备好明天的内容哦，到时候再来看看吧！"
            });
        }
    } catch (error) {
        console.error("Tomorrow Music API Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});


app.listen(PORT, () => {
    console.log(`Music Backend is running at http://localhost:${PORT}`);
});

// Helper Functions for QQ Music

// 辅助函数：解析 QQ 音乐链接获取元数据
async function getQQMusicMetadataFromLink(qqLink) {
    try {
        console.log(`Fetching QQ Music Page: ${qqLink}`);
        // 1. 获取外链页面内容
        // 我们需要模拟 User-Agent 防止被拦截
        const response = await fetch(qqLink, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await response.text();

        // 2. 解析页面中的 __ssrFirstPageData__ 变量
        // 这一块包含了歌曲的详细元数据（歌名、歌手、MID等）
        const match = html.match(/window\.__ssrFirstPageData__\s*=\s*(\{.+?\})(?:;|<\/script>)/s);
        if (!match) {
            console.error("Could not find __ssrFirstPageData__ in QQ Music response");
            return null;
        }

        const data = JSON.parse(match[1]);
        // 兼容单曲和歌单（songList）结构
        const songToPlay = data.song || (data.songList && data.songList[0]);

        if (!songToPlay) return null;

        // 获取歌曲的关键 ID：
        // mid: 歌曲本身的唯一标识
        // mediaId: 音频文件的标识 (通常在 file.media_mid 中)
        const mid = songToPlay.mid;
        const mediaId = songToPlay.file ? songToPlay.file.media_mid : mid;

        return {
            mid: mid,
            mediaId: mediaId,
            name: songToPlay.name || songToPlay.title,
            artists: songToPlay.singer ? songToPlay.singer.map(s => s.name) : [],
            cover: songToPlay.album ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${songToPlay.album.mid}.jpg` : ''
        };

    } catch (e) {
        console.error("Error in getQQMusicMetadataFromLink:", e);
        return null;
    }
}

// 辅助函数：通过 ID/MID 获取歌曲详细信息
async function getQQMusicMetadataFromId(id) {
    try {
        // 1. 判断 ID 类型
        // 如果全是数字，通常是 songid；如果包含字符，则是 songmid
        const isSongMid = isNaN(Number(id)); 
        console.log(`Fetching QQ Music Metadata for ID: ${id} (isMid: ${isSongMid})`);
        
        // 2. 构造 u.y.qq.com API 请求体
        const payload = {
            comm: { ct: 24, cv: 0 },
            songinfo: {
                method: "get_song_detail_yqq",
                module: "music.pf_song_detail_svr",
                param: {
                    song_mid: isSongMid ? id : "",   // 传入 songmid
                    song_id: isSongMid ? 0 : parseInt(id) // 或 songid
                }
            }
        };

        const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
        
        // 3. 请求 API 获取详情
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                // 需要 Referer 才能通过校验
                'Referer': 'https://y.qq.com/'
            }
        });
        const json = await response.json();
        
        // 4. 解析返回结果
        const trackInfo = json?.songinfo?.data?.track_info;
        
        if (!trackInfo) {
             console.error("QQ Music Metadata not found for ID:", id);
             return null;
        }

        // 提取并返回标准格式元数据
        return {
            mid: trackInfo.mid,
            mediaId: trackInfo.file ? trackInfo.file.media_mid : trackInfo.mid,
            name: trackInfo.name,
            artists: trackInfo.singer ? trackInfo.singer.map(s => s.name) : [],
            cover: trackInfo.album ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${trackInfo.album.mid}.jpg` : ''
        };

    } catch (e) {
        console.error("Error in getQQMusicMetadataFromId:", e);
        return null;
    }
}

// 辅助函数：获取播放链接（核心逻辑）
async function getQQMusicPlayUrl(mid, mediaId) {
    // 1. 生成随机 GUID
    // QQ 音乐的 vkey 是和 guid 绑定的，每次随机生成可以确保获取到最新的有效 key
    const guid = Math.floor(Math.random() * 10000000000).toString();
    
    // 2. 构造文件名
    // 统一请求标准音质 (C400)，格式为: C400 + mediaId + .m4a
    // 这种格式兼容性最好，无论是否 VIP 歌曲，API 通常都会返回结果
    const filename = mediaId ? `C400${mediaId}.m4a` : `C400${mid}.m4a`;
    
    // 3. 构造请求体获取 vkey
    // req: 通用 CDN 调度请求，用于 fallback 取 vkey
    // req_0: 特定歌曲的 vkey 请求，包含 filename
    const payload = {
        req: {
            module: 'CDN.SrfCdnDispatchServer',
            method: 'GetCdnDispatch',
            param: { guid, calltype: 0, userip: '' }
        },
        req_0: {
            module: 'vkey.GetVkeyServer',
            method: 'CgiGetVkey',
            param: {
                guid,
                songmid: [mid],
                songtype: [0],
                uin: '0',
                loginflag: 1, // 模拟登录态
                platform: '20',
                filename: [filename]
            }
        },
        comm: { uin: 0, format: 'json', ct: 24, cv: 0 }
    };

    try {
        const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
        const res = await fetch(apiUrl, {
            headers: {
                'Referer': 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const json = await res.json();
        
        const midurlinfos = json?.req_0?.data?.midurlinfo;
        // 强制使用该域名 (用户验证通过)
        const sip = 'https://aqqmusic.tc.qq.com/amobile.music.tc.qq.com/'; 

        // 4. 尝试解析标准返回
        // 如果 req_0 直接返回了 purl (playback url)，则直接拼接返回
        if (midurlinfos && midurlinfos[0] && midurlinfos[0].purl) {
            return sip + midurlinfos[0].purl;
        }

        // 5. 降级方案 (Fallback)
        // 如果没有特定 purl，但 req 返回了通用 vkey
        // 我们强制手动拼接链接：域名 + 文件名 + vkey + guid
        if (json?.req?.data?.vkey) {
            const vkey = json.req.data.vkey;
            console.log(`Using fallback vkey for Standard: ${filename}`);
            return `${sip}${filename}?vkey=${vkey}&guid=${guid}&uin=0&fromtag=66`;
        }

    } catch (e) {
        console.error("Error fetching VKey:", e);
    }
    return null;
}

// Helper Functions for Netease Music

/**
 * 辅助函数：解析网易云音乐元数据
 * 支持输入 ID 或 链接 (如外链播放器链接)
 */
async function getNeteaseMusicMetadata(idOrLink) {
    try {
        let musicId = idOrLink.toString();
        // 如果是链接，提取 ID
        if (musicId.startsWith('http')) {
            const match = musicId.match(/id=(\d+)/);
            if (match) {
                musicId = match[1];
            }
        }

        console.log(`Fetching Netease Music Metadata for ID: ${musicId}`);
        
        // 使用网易云公开详情 API (无需自建 API 服务)
        const apiUrl = `https://music.163.com/api/song/detail/?id=${musicId}&ids=[${musicId}]`;
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://music.163.com/'
            }
        });
        const data = await response.json();

        if (data.songs && data.songs.length > 0) {
            const song = data.songs[0];
            return {
                id: musicId,
                name: song.name,
                artists: song.artists ? song.artists.map(a => a.name) : [],
                cover: song.album ? song.album.picUrl : ''
            };
        }
    } catch (e) {
        console.error("Error in getNeteaseMusicMetadata:", e);
    }
    return null;
}