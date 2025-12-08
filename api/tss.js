export default async (req, res) => {
  const { text, reference_id } = req.body;
  const resp = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.FISH_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, reference_id, format: 'mp3' })
  });
  const audio = await resp.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(Buffer.from(audio));
};
