# The runnable-URL executor for our Evaluator adapters, as a Hugging Face Docker Space (free CPU tier).
# It runs the kit's reference adapterexec, so its scores are the bits validators compute, behind
# track2/adapter/fanout_exec.py, which gives each family its own path: https://<space>.hf.space/<FAMILY>.
# Every downloaded file is checked against a pinned sha256; a mismatch fails the build.

FROM golang:1.25 AS build
ARG KIT_COMMIT=1ed063e2f006
RUN git clone https://github.com/telegraphprotocol/telegraph-wasm-baseline /kit \
 && cd /kit && git checkout "$KIT_COMMIT" \
 && CGO_ENABLED=0 go build -o /adapterexec ./cmd/adapterexec

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
WORKDIR /app

# The Foundation Model release validators run (foundation 0a49b325…, engine 77643d6e…).
ARG FOUNDATION=https://github.com/telegraphprotocol/telegraph-foundation/releases/download/modernbert-base-lora16-v1
RUN mkdir foundation && cd foundation \
 && curl -fsSLO "$FOUNDATION/foundation_lora_fp32.onnx" && curl -fsSLO "$FOUNDATION/foundation_engine.wasm" \
 && printf '%s\n' \
    "0a49b325304bb4cf292e683929689d0457966be264f60bfc94d0072b614bf8e6  foundation_lora_fp32.onnx" \
    "77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de  foundation_engine.wasm" \
    | sha256sum -c -

COPY adapters.txt start.sh ./
COPY fanout_exec.py check_executor.py ./
RUN mkdir packages && grep -v '^#' adapters.txt | while read -r family url sha; do \
      [ -n "$family" ] || continue; \
      curl -fsSL "$url" -o "packages/$family.safetensors" \
      && echo "$sha  packages/$family.safetensors" | sha256sum -c - || exit 1; \
    done
COPY --from=build /adapterexec /usr/local/bin/adapterexec

ENV FOUNDATION_MODEL_PATH=/app/foundation/foundation_lora_fp32.onnx \
    FOUNDATION_MODEL_HASH=0a49b325304bb4cf292e683929689d0457966be264f60bfc94d0072b614bf8e6 \
    FOUNDATION_ENGINE_WASM_PATH=/app/foundation/foundation_engine.wasm \
    FOUNDATION_ENGINE_WASM_HASH=77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de \
    WORKERS_PER_ADAPTER=2
RUN chown -R user /app
USER user
EXPOSE 7860
CMD ["bash", "/app/start.sh"]
