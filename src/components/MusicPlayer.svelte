<script lang="ts">
    import Icon from "@iconify/svelte";
    import { onMount } from "svelte";
    // import { musicConfig } from "../config";

    let isPlaying = $state(false);
    let audio: HTMLAudioElement | undefined = $state();
    let songTitle = $state("");
    let isLoading = $state(true);
    let musicUrl = $state("");
    
    async function fetchMusicInfo() {
        try {
            // 从后端获取今日音乐信息
            const apiBase = import.meta.env.PUBLIC_BASE_URL || 'https://api.xn--24wq0n.top';
            const res = await fetch(`${apiBase}/api/today-music`);
            const data = await res.json();
            if (data.success && data.musicUrl) {
                musicUrl = data.musicUrl;
                // 格式化标题: 歌名 - 歌手1、歌手2
                const artistsStr = data.artists ? data.artists.join('、') : "";
                songTitle = artistsStr ? `${data.name} - ${artistsStr}` : data.name;
            } else {
                musicUrl = "";
                songTitle = "";
            }
        } catch (e) {
            console.warn("无法获取音乐信息:", e);
            musicUrl = "";
            songTitle = "";
        } finally {
            isLoading = false;
        }
    }

    onMount(() => {
        fetchMusicInfo();
    });

    function togglePlay() {
        if (!audio || isLoading || !musicUrl) return;
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
        console.error("音频加载失败");
        isPlaying = false;
    }
</script>

{#if !isLoading && musicUrl && songTitle}
<div class="flex items-center group relative h-11">
    <audio 
        bind:this={audio} 
        src={musicUrl} 
        onended={handleEnded}
        onerror={handleError}
        preload="none"
    ></audio>
    
    <button 
        onclick={togglePlay}
        class="btn-plain scale-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90"
        aria-label={isPlaying ? "暂停" : "播放"}
    >
        {#if isPlaying}
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
{/if}

<style>
    /* 你可以在这里添加一些动画效果，比如播放时的旋转等 */
</style>
