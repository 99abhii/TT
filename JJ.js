import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
public class BodyLoggingFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(BodyLoggingFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return logRequest(exchange)
            .then(chain.filter(exchange))
            .then(logResponse(exchange));
    }

    private Mono<Void> logRequest(ServerWebExchange exchange) {
        return DataBufferUtils.join(exchange.getRequest().getBody())
            .flatMap(dataBuffer -> {
                byte[] bytes = new byte[dataBuffer.readableByteCount()];
                dataBuffer.read(bytes);
                DataBufferUtils.release(dataBuffer);
                
                String body = new String(bytes, StandardCharsets.UTF_8);
                log.info("Request body: {}", body);
                
                // Replace the body for further processing
                exchange.getRequest().mutate().body(Flux.just(exchange.getResponse().bufferFactory().wrap(bytes)));
                return Mono.empty();
            });
    }

    private Mono<Void> logResponse(ServerWebExchange exchange) {
        return DataBufferUtils.join(exchange.getResponse().writeWith())
            .flatMap(dataBuffer -> {
                byte[] bytes = new byte[dataBuffer.readableByteCount()];
                dataBuffer.read(bytes);
                DataBufferUtils.release(dataBuffer);
                
                String body = new String(bytes, StandardCharsets.UTF_8);
                log.info("Response body: {}", body);
                
                // Replace the body for further processing
                exchange.getResponse().writeWith(Flux.just(exchange.getResponse().bufferFactory().wrap(bytes)));
                return Mono.empty();
            });
    }

    @Override
    public int getOrder() {
        return -2; // Ensure this runs before most other filters
    }
}
