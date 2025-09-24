const axios = require('axios');

module.exports = async function (req, res) {
  // 从查询参数获取url
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "请提供 url 参数" });
  }

  try {
    // Step 1: 处理短链跳转
    let finalUrl = url;
    if (url.includes('v.douyin.com')) {
      const redirectRes = await axios.get(url, {
        maxRedirects: 5,
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      finalUrl = redirectRes.request?.res?.responseUrl || url;
    }

    // Step 2: 提取 aweme_id
    const idMatch = finalUrl.match(/(?:video|note)\/(\d+)/);
    if (!idMatch || !idMatch[1]) {
      return res.status(400).json({ error: "无法提取视频ID" });
    }
    const aweme_id = idMatch[1];

    // Step 3: 调用抖音官方接口
    const apiRes = await axios.get(
      `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${aweme_id}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Referer': 'https://www.douyin.com/',
        }
      }
    );

    const data = apiRes.data?.item_list?.[0];
    if (!data) {
      return res.status(404).json({ error: "视频不存在或接口无返回" });
    }

    // Step 4: 返回结果
    res.status(200).json({
      success: true,
      videoUrl: data.video?.play_addr?.url_list?.[0] || "",
      desc: data.desc || "",
      author: data.author?.nickname || "未知",
      like_count: data.statistics?.digg_count || 0,
      comment_count: data.statistics?.comment_count || 0,
      collect_count: data.statistics?.collect_count || 0,
      share_count: data.statistics?.share_count || 0,
      publish_time: data.create_time ? new Date(data.create_time * 1000).toISOString() : "未知"
    });

  } catch (error) {
    console.error("解析失败:", error.message);
    res.status(500).json({ error: "服务端解析失败，请稍后重试" });
  }
}
