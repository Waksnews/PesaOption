declare module 'africastalking' {
  interface SMSOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface AfricasTalkingSMS {
    send(options: SMSOptions): Promise<any>;
  }

  interface AfricasTalkingClient {
    SMS: AfricasTalkingSMS;
  }

  interface AfricasTalkingCredentials {
    apiKey: string;
    username: string;
  }

  function AfricasTalking(credentials: AfricasTalkingCredentials): AfricasTalkingClient;
  export = AfricasTalking;
}
