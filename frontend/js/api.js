export async function streamChat(messages, onToken, onDone, onError, signal) {
    try {
        // Use Cloudflare Worker URL for production deployment
        const apiBase = "https://super-octo-broccoli.ackcrp.workers.dev";
        const response = await fetch(`${apiBase}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
            signal: signal // Add support for abort signal
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        // Handle streaming response using Server-Sent Events
        if (response.headers.get('Content-Type') === 'text/event-stream') {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = ''; // Track full content for onToken callback

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith(':')) continue;

                    if (trimmed.startsWith('data: ')) {
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            switch (parsed.type) {
                                case 'text':
                                    if (parsed.content) {
                                        fullContent += parsed.content; // Accumulate full content
                                        onToken(parsed.content, fullContent); // Pass both token and full content
                                    }
                                    break;
                                case 'search':
                                    // Handle search status if needed
                                    console.log('Search status:', parsed.status);
                                    break;
                                case 'diagnostic':
                                    // Handle diagnostic info if needed
                                    console.log('Diagnostic info:', parsed.info);
                                    break;
                                case 'done':
                                    onDone(fullContent); // Pass accumulated full content
                                    break;
                                case 'error':
                                    onError(new Error(parsed.error));
                                    break;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } else {
            // Fallback for non-streaming responses
            const data = await response.json();
            onToken(data.content, data.content); // Pass both token and full content
            onDone(data.content);
        }
    } catch (err) {
        if (err.name !== 'AbortError') { // Don't report abort errors
            onError(err);
        }
    }
}
