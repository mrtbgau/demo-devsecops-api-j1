const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { trace } = require('@opentelemetry/api');

// OBSERVABILITE (BONUS) : Tracing distribue avec OpenTelemetry
// Cree des spans manuels pour chaque action critique (login, inscription, telechargement)
// Exporte vers la console par defaut, vers un collecteur OTLP si configure
function initTracing() {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'devsecops-api'
    })
  });

  // Export vers la console (visible dans les logs du serveur)
  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

  // Export OTLP optionnel (Jaeger, Zipkin, etc.) si un endpoint est configure
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const otlpExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    });
    provider.addSpanProcessor(new SimpleSpanProcessor(otlpExporter));
  }

  provider.register();
  return trace.getTracer('devsecops-api');
}

// Ne pas initialiser le tracing pendant les tests
const tracer = process.env.NODE_ENV !== 'test' ? initTracing() : null;

module.exports = { tracer };
