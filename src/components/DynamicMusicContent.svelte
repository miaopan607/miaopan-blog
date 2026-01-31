<script lang="ts">
    import { onMount } from 'svelte';
    import { marked } from 'marked';

    const apiBase = import.meta.env.PUBLIC_BASE_URL || 'https://api.xn--24wq0n.top';
    let { apiUrl = `${apiBase}/api/today-music` } = $props();
    let content = $state('正在加载音乐内容...');
    let isLoading = $state(true);
    let error = $state('');

    async function fetchMusicContent() {
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.success) {
                // 使用 marked 将 markdown 转为 HTML
                content = await marked.parse(data.content);
            } else {
                content = await marked.parse(data.content || '今日暂无推荐');
            }
        } catch (e) {
            console.error('获取音乐内容失败:', e);
            error = '无法连接到后端服务，请检查后端是否启动。';
            content = '加载失败，请稍后再试。';
        } finally {
            isLoading = false;
        }
    }

    onMount(() => {
        fetchMusicContent();
    });
</script>

<div class="dynamic-content">
    {#if isLoading}
        <div class="flex justify-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
    {:else}
        {@html content}
        {#if error}
            <p class="text-red-500 mt-4 text-sm">{error}</p>
        {/if}
    {/if}
</div>

<style>
    /* 保持与 Markdown.astro 类似的样式 */
    .dynamic-content :global(h1) {
        font-size: 1.875rem;
        font-weight: 700;
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: var(--primary);
    }
    .dynamic-content :global(h2) {
        font-size: 1.5rem;
        font-weight: 600;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
    }
    .dynamic-content :global(p) {
        margin-bottom: 1rem;
        line-height: 1.75;
    }
    .dynamic-content :global(details) {
        border: 1px solid #333;
        border-radius: 8px;
        padding: 15px;
        background: rgba(255,255,255,0.05);
        margin-bottom: 1rem;
    }
    .dynamic-content :global(summary) {
        cursor: pointer;
        font-weight: bold;
        color: #9da3ff;
    }
    .dynamic-content :global(a) {
        color: var(--primary);
        text-decoration: underline;
        transition: opacity 0.2s;
    }
    .dynamic-content :global(a:hover) {
        opacity: 0.8;
    }
</style>
