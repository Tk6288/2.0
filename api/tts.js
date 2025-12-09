export default async function handler(req, res) {
  // 1. 设置跨域允许
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { text, voice, reference_id, reference_audio, reference_text } = req.body;

    // 2. 关键修改在这里！获取 Key 的逻辑
    // 优先使用前端发来的 Key (req.headers.authorization)
    // 如果前端没发，才去读环境变量 (process.env.FISH_KEY)
    let apiKey = req.headers.authorization;
    if (!apiKey && process.env.FISH_KEY) {
      apiKey = 'Bearer ' + process.env.FISH_KEY;
    }

    // 如果两个地方都没填，报错
    if (!apiKey) {
      return res.status(401).json({ error: "No API Key provided. Please enter TTS Key in settings." });
    }

    // 3. 构建数据包
    const fishPayload = {
      text: text,
      format: "mp3",
      mp3_bitrate: 128
    };

    if (reference_audio && reference_audio.length > 0) {
      // 模式 A: 参考音频
      const cleanBase64 = reference_audio.includes(',') ? reference_audio.split(',')[1] : reference_audio;
      fishPayload.reference_audio = cleanBase64;
      fishPayload.reference_text = reference_text || "";
    } else {
      // 模式 B: Voice ID
      const finalRefId = reference_id || voice;
      if (!finalRefId) {
        return res.status(400).json({ error: "Missing Voice ID or Reference Audio" });
      }
      fishPayload.reference_id = finalRefId;
    }

    // 4. 发送请求
    const resp = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': apiKey, // <--- 这里现在使用我们要么从前端拿、要么从后台拿的 Key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fishPayload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).send(errText);
    }

    const audio = await resp.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audio));

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
