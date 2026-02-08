export type SSEEvent = {
  event: string;
  data: string;
};

/**
 * Parses raw SSE text chunks into structured events.
 * Handles the case where a chunk may be split across event boundaries.
 */
export function createSSEParser() {
  let buffer = "";

  return {
    /**
     * Feed a raw text chunk from the stream.
     * Returns an array of fully-parsed SSE events found in the chunk.
     */
    feed(chunk: string): SSEEvent[] {
      buffer += chunk;
      const events: SSEEvent[] = [];

      // SSE events are separated by double newlines
      const parts = buffer.split("\n\n");

      // The last part may be incomplete — keep it in the buffer
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        let event = "message";
        let data = "";

        for (const line of trimmed.split("\n")) {
          if (line.startsWith("event: ")) {
            event = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.slice(6);
          } else if (line.startsWith("data:")) {
            data = line.slice(5);
          }
        }

        if (data || event) {
          events.push({ event, data });
        }
      }

      return events;
    },

    /** Flush any remaining buffered data. */
    flush(): SSEEvent[] {
      if (!buffer.trim()) {
        buffer = "";
        return [];
      }
      const remaining = buffer;
      buffer = "";
      return this.feed(remaining + "\n\n");
    },
  };
}
