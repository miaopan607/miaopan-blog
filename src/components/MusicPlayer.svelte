<script lang="ts">
    import Icon from "@iconify/svelte";
    import { onMount } from "svelte";
    import { musicConfig } from "../config";

    let isPlaying = $state(false);
    let audio: HTMLAudioElement;
    let songTitle = $state("加载中...");
    let isLoading = $state(true);
    let musicUrl = $state("");
    
    async function fetchMusicInfo() {
        let currentMusicId = musicConfig.id;

        try {
            // 尝试从后端获取今日音乐 ID
            const res = await fetch('https://api.xn--24wq0n.top/api/today-music');
            const data = await res.json();
            if (data.success && data.musicId) {
                currentMusicId = data.musicId;
            }
        } catch (e) {
            console.warn("无法从后端获取音乐 ID，使用默认配置");
        }

        const apis = [
            `https://api.i-meto.com/meting/api?server=netease&type=song&id=${currentMusicId}`,
            `https://api.injahow.cn/meting/?type=song&id=${currentMusicId}`
        ];

        for (const api of apis) {
            try {
                const response = await fetch(api);
                if (!response.ok) continue;
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const info = data[0];
                    songTitle = info.title || info.name || "未知曲目";
                    musicUrl = info.url || info.link || `https://music.163.com/song/media/outer/url?id=${currentMusicId}.mp3`;
                    isLoading = false;
                    return; // 成功获取，退出循环
                }
            } catch (error) {
                console.warn(`API ${api} 加载失败，尝试下一个...`);
            }
        }

        // 所有 API 都失败后的最终降级方案
        songTitle = "点击播放";
        musicUrl = `https://music.163.com/song/media/outer/url?id=${currentMusicId}.mp3`;
        isLoading = false;
    }

    onMount(() => {
        fetchMusicInfo();
    });

    function togglePlay() {
        if (!audio || isLoading) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(err => {
                console.error("播放失败:", err);
            });
        }
        isPlaying = !isPlaying;
    }

    function handleEnded() {
        isPlaying = false;
    }

    function handleError() {
        console.error("音频播放出错，尝试更换源...");
        // 如果当前播放出错，可以尝试切换到最基础的网易云外链源
        if (musicUrl !== `https://music.163.com/song/media/outer/url?id=${musicConfig.id}.mp3`) {
            musicUrl = `https://music.163.com/song/media/outer/url?id=${musicConfig.id}.mp3`;
        } else {
            songTitle = "播放失败";
            isPlaying = false;
        }
    }
</script>

<div class="flex items-center group relative h-11">
    {#if musicUrl}
        <audio 
            bind:this={audio} 
            src={musicUrl} 
            onended={handleEnded}
            onerror={handleError}
            preload="none"
        ></audio>
    {/if}
    
    <button 
        onclick={togglePlay}
        disabled={isLoading}
        class="btn-plain scale-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 disabled:opacity-50"
        aria-label={isPlaying ? "暂停" : "播放"}
    >
        {#if isLoading}
            <Icon icon="line-md:loading-twotone-loop" class="text-[1.25rem] text-[var(--primary)]" />
        {:else if isPlaying}
            <Icon icon="material-symbols:pause-rounded" class="text-[1.5rem] text-[var(--primary)]" />
        {:else}
            <Icon icon="material-symbols:play-arrow-rounded" class="text-[1.5rem] text-[var(--primary)]" />
        {/if}
    </button>
    
    <div class="hidden xl:block text-sm font-medium text-[var(--primary)] max-w-[120px] overflow-hidden whitespace-nowrap text-ellipsis ml-1 transition-all duration-300 opacity-0 group-hover:opacity-100">
        {songTitle}
    </div>
    <!-- 始终显示的歌名，但在小屏幕隐藏 -->
    <div class="hidden lg:block xl:hidden text-xs font-medium text-[var(--primary)] max-w-[80px] overflow-hidden whitespace-nowrap text-ellipsis ml-1">
        {songTitle}
    </div>
    <!-- 在大屏幕上默认显示，不需要 hover -->
    <div class="hidden xl:block text-xs font-medium text-[var(--primary)] max-w-[100px] overflow-hidden whitespace-nowrap text-ellipsis ml-1 absolute left-12 pointer-events-none transition-all duration-300 group-hover:hidden">
        {songTitle}
    </div>
</div>

<style>
    /* 你可以在这里添加一些动画效果，比如播放时的旋转等 */
</style>
