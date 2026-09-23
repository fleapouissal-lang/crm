import { generateSalesAgentText, isSalesAgentConfigured } from "./client";

export type InboundMedia = {
  type?: string | null;
  messageId?: string | null;
  instanceId?: string | null;
  caption?: string | null;
};

function bridgeConfig() {
  const url = process.env.WA_BRIDGE_URL?.replace(/\/$/, "");
  const secret = process.env.WA_BRIDGE_SECRET;
  return url && secret ? { url, secret } : null;
}

async function downloadBridgeMedia(
  instanceId: string,
  messageId: string
): Promise<{ bytes: Buffer; mime: string } | null> {
  const cfg = bridgeConfig();
  if (!cfg) return null;
  const encodedInst = encodeURIComponent(instanceId);
  const encodedMsg = encodeURIComponent(messageId);
  const attempts: Array<{ path: string; method: "GET" | "POST"; body?: string }> = [
    { path: `/instance/${encodedInst}/media/${encodedMsg}`, method: "GET" },
    { path: `/instance/${encodedInst}/message/${encodedMsg}/media`, method: "GET" },
    {
      path: `/instance/${encodedInst}/media`,
      method: "POST",
      body: JSON.stringify({ messageId }),
    },
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetch(`${cfg.url}${attempt.path}`, {
        method: attempt.method,
        headers: {
          apikey: cfg.secret,
          ...(attempt.body ? { "content-type": "application/json" } : {}),
        },
        body: attempt.body,
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json().catch(() => null)) as
          | { data?: string; mime?: string; mimeType?: string; url?: string }
          | null;
        if (payload?.data) {
          return {
            bytes: Buffer.from(payload.data, "base64"),
            mime: payload.mime || payload.mimeType || "application/octet-stream",
          };
        }
        if (payload?.url && /^https?:\/\//i.test(payload.url)) {
          const file = await fetch(payload.url, { signal: AbortSignal.timeout(15_000) });
          if (!file.ok) continue;
          return {
            bytes: Buffer.from(await file.arrayBuffer()),
            mime: file.headers.get("content-type") || "application/octet-stream",
          };
        }
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 32) continue;
      return { bytes, mime: contentType || "application/octet-stream" };
    } catch {
      continue;
    }
  }
  return null;
}

async function describeImage(bytes: Buffer, mime: string): Promise<string | null> {
  if (!isSalesAgentConfigured()) return null;
  const mediaType = mime.includes("png")
    ? "image/png"
    : mime.includes("webp")
      ? "image/webp"
      : mime.includes("gif")
        ? "image/gif"
        : "image/jpeg";
  try {
    const text = await generateSalesAgentText({
      maxTokens: 400,
      user: [
        {
          type: "image",
          mimeType: mediaType,
          data: bytes.toString("base64"),
        },
        {
          type: "text",
          text: "Décris précisément cette image WhatsApp pour un commercial IT (site, brief, facture, screenshot, carte…). Extraire tout texte visible. 8 lignes max.",
        },
      ],
    });
    return text || null;
  } catch {
    return null;
  }
}

async function readPdf(bytes: Buffer): Promise<string | null> {
  if (!isSalesAgentConfigured()) return null;
  if (bytes.length > 8_000_000) return "[PDF trop volumineux]";
  try {
    const text = await generateSalesAgentText({
      maxTokens: 700,
      user: [
        {
          type: "pdf",
          data: bytes.toString("base64"),
        },
        {
          type: "text",
          text: "Résume ce PDF pour un commercial IT : besoin, périmètre, contraintes, dates, budget si présent. 15 lignes max.",
        },
      ],
    });
    return text || null;
  } catch {
    return null;
  }
}

async function whisperForm(url: string, apiKey: string, model: string, bytes: Buffer, mime: string) {
  const ext = mime.includes("ogg") || mime.includes("opus") ? "ogg" : mime.includes("mpeg") ? "mp3" : "wav";
  const form = new FormData();
  form.append("model", model);
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: mime || "audio/ogg" }),
    `voice.${ext}`
  );
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() || null;
}

async function transcribeViaBridge(instanceId: string, messageId: string): Promise<string | null> {
  const cfg = bridgeConfig();
  if (!cfg) return null;
  try {
    const response = await fetch(
      `${cfg.url}/instance/${encodeURIComponent(instanceId)}/transcribe`,
      {
        method: "POST",
        headers: { "content-type": "application/json", apikey: cfg.secret },
        body: JSON.stringify({ messageId }),
        signal: AbortSignal.timeout(40_000),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { text?: string; transcript?: string };
    return (payload.text || payload.transcript || "").trim() || null;
  } catch {
    return null;
  }
}

async function transcribeAudio(
  bytes: Buffer | null,
  mime: string,
  instanceId?: string | null,
  messageId?: string | null
): Promise<string | null> {
  if (instanceId && messageId) {
    const fromBridge = await transcribeViaBridge(instanceId, messageId);
    if (fromBridge) return fromBridge;
  }
  if (!bytes) return null;
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    const text = await whisperForm(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      groq,
      "whisper-large-v3",
      bytes,
      mime
    );
    if (text) return text;
  }
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    return whisperForm(
      "https://api.openai.com/v1/audio/transcriptions",
      openai,
      "whisper-1",
      bytes,
      mime
    );
  }
  return null;
}

export async function resolveInboundText(
  caption: string,
  media: InboundMedia | undefined
): Promise<{ text: string; source: "text" | "image" | "audio" | "pdf" | "video" | "unknown-media" }> {
  const captionTrim = (caption || media?.caption || "").trim();
  const kind = String(media?.type || "").toLowerCase();
  const isAudio = kind.includes("audio") || kind.includes("ptt") || kind.includes("voice");
  const isImage = kind.includes("image") || kind.includes("sticker");
  const isPdf = kind.includes("pdf") || kind.includes("document");
  const isVideo = kind.includes("video");

  if (!kind || (!isAudio && !isImage && !isPdf && !isVideo)) {
    return { text: captionTrim, source: "text" };
  }

  let downloaded: { bytes: Buffer; mime: string } | null = null;
  if (media?.instanceId && media.messageId) {
    downloaded = await downloadBridgeMedia(media.instanceId, media.messageId);
  }

  if (isImage) {
    const described = downloaded ? await describeImage(downloaded.bytes, downloaded.mime) : null;
    const text = [captionTrim, described ? `[Image] ${described}` : "[Image reçue — description indisponible]"]
      .filter(Boolean)
      .join("\n");
    return { text, source: "image" };
  }

  if (isPdf || downloaded?.mime.includes("pdf")) {
    const summary = downloaded ? await readPdf(downloaded.bytes) : null;
    return {
      text: [captionTrim, summary ? `[PDF] ${summary}` : "[PDF reçu — lecture indisponible]"]
        .filter(Boolean)
        .join("\n"),
      source: "pdf",
    };
  }

  if (isVideo) {
    const audioGuess = downloaded?.mime.startsWith("audio/")
      ? await transcribeAudio(downloaded.bytes, downloaded.mime, media?.instanceId, media?.messageId)
      : null;
    return {
      text: [
        captionTrim,
        audioGuess ? `[Vidéo / piste audio] ${audioGuess}` : "[Vidéo reçue — décris-moi l’essentiel en texte si besoin]",
      ]
        .filter(Boolean)
        .join("\n"),
      source: "video",
    };
  }

  if (isAudio) {
    const transcript = await transcribeAudio(
      downloaded?.bytes ?? null,
      downloaded?.mime || "audio/ogg",
      media?.instanceId,
      media?.messageId
    );
    if (transcript) {
      return {
        text: [captionTrim, `[Vocal] ${transcript}`].filter(Boolean).join("\n"),
        source: "audio",
      };
    }
    return {
      text: captionTrim || "[Vocal non transcrit — demander d’écrire l’idée]",
      source: "audio",
    };
  }

  return { text: captionTrim || "Média reçu", source: "unknown-media" };
}
