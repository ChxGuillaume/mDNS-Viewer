import type { Service } from 'bonjour-service';
import type { RPCSchema } from 'electrobun';

export interface MyWebviewRPCType {
  bun: RPCSchema<{}>;
  webview: RPCSchema<{
    requests: {};
    messages: {
      service: {
        service: Service;
      };
    };
  }>;
}
