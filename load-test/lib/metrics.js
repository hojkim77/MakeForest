import { Trend, Rate, Gauge } from 'k6/metrics';

export const sseConnectionDuration = new Trend('sse_connection_duration', true);
export const sseEventLatency       = new Trend('sse_event_latency', true);
export const sseDisconnectRate     = new Rate('sse_disconnect_rate');
export const waterApiDuration      = new Trend('water_api_duration', true);
export const cujTotalDuration      = new Trend('cuj_total_duration', true);
export const batchImpactDelta      = new Gauge('batch_impact_delta');
