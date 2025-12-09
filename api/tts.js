export default async function handler(req, res) {
  // 1. 设置跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. 接收参数：增加了 reference_audio 和 reference_text
    const { text, voice, reference_id, reference_audio, reference_text } = req.body;

    // 3. 准备发给 Fish Audio 的基础数据
    const fishPayload = {
      text: text,
      format: "mp3",
      mp3_bitrate: 128
    };

    // 4. 核心逻辑：优先用音频，没音频才用 ID
    if (reference_audio && reference_audio.length > 0) {
      console.log("Using Reference Audio Mode");
      // 去掉 Base64 头部 (data:audio/...)，Fish Audio 只要纯数据部分
      // 前端发来的通常是 data URL，我们需要 split 一下，或者直接传
      // 注意：通常 API 需要纯 Base64 字符串，这里做个简单处理
      const cleanBase64 = reference_audio.includes(',') ? reference_audio.split(',')[1] : reference_audio;
      
      fishPayload.reference_audio = cleanBase64;
      fishPayload.reference_text = reference_text || ""; 
    } else {
      console.log("Using Reference ID Mode");
      // 兼容逻辑：优先用 reference_id，没有则取 voice，防止传空
      const finalRefId = reference_id || voice;
      if (!finalRefId) {
        return res.status(400).json({ error: "No Voice ID or Reference Audio provided" });
      }
      fishPayload.reference_id = finalRefId;
    }

    // 5. 发送请求
    const resp = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.FISH_KEY, // 确保 Vercel 环境变量里填了 FISH_KEY
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fishPayload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Fish API Error:", errText);
      return res.status(resp.status).send(errText);
    }

    const audio = await resp.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audio));

  } catch (e) {
    console.error("Server Error:", e);
    res.status(500).json({ error: e.message });
  }
}
