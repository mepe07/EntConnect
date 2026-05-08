import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as appInsights from 'applicationinsights';

@Injectable()
export class AppInsightsLogger extends ConsoleLogger {
  
  private readonly contextosIgnorados = [
    'RouterExplorer', 
    'RoutesResolver', 
    'InstanceLoader', 
    'NestFactory',
    'NestApplication'
  ];

  private formataMensagem(message: any, context?: string): string {
    const texto = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message);
    return context ? `[${context}] ${texto}` : texto;
  }

  log(message: any, ...optionalParams: any[]) {
    super.log(message, ...optionalParams);

    if (appInsights.defaultClient) {
      const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;
      const contextString = typeof context === 'string' ? context : undefined;

      if (contextString && this.contextosIgnorados.includes(contextString)) {
        return; 
      }

      appInsights.defaultClient.trackTrace({ 
        message: this.formataMensagem(message, contextString),
        severity: 'Information' // 1 = Information
      });
    }
  }

  error(message: any, ...optionalParams: any[]) {
    super.error(message, ...optionalParams);
    
    if (appInsights.defaultClient) {
      const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;
      const contextString = typeof context === 'string' ? context : undefined;

      appInsights.defaultClient.trackException({
        exception: new Error(this.formataMensagem(message, contextString)),
      });
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    super.warn(message, ...optionalParams);
    
    if (appInsights.defaultClient) {
      const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;
      const contextString = typeof context === 'string' ? context : undefined;

      appInsights.defaultClient.trackTrace({ 
        message: `[AVISO] ${this.formataMensagem(message, contextString)}`,
        severity: 'Warning' // 2 = Warning
      });
    }
  }
}
