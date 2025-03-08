import { createInterface, Interface } from "readline";

export interface MessagingStream {
  prompt: (message: string) => Promise<string>;
}

export class CLI implements MessagingStream {
  private rl: Interface;
  private spinnerInterval: NodeJS.Timeout | null = null;

  /**
   * @param onResponse An async callback invoked with the user's response.
   */
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Starts an ASCII spinner with the given message.
   * @param spinnerMessage The message to display alongside the spinner.
   * @returns The interval ID.
   */
  private startSpinner(spinnerMessage: string = ""): NodeJS.Timeout {
    const spinnerFrames = ["-", "\\", "|", "/"];
    let spinnerIndex = 0;
    return setInterval(() => {
      process.stdout.write(`\r${spinnerFrames[spinnerIndex]}` + spinnerMessage);
      spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 100) as unknown as NodeJS.Timeout;
  }

  /**
   * Clears any running spinner and erases the spinner line.
   */
  private clearSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
      process.stdout.write("\r" + " ".repeat(40) + "\r");
    }
  }

  /**
   * Sends a prompt to the user and awaits a response.
   * While waiting for input, displays a spinner with "Waiting for response...".
   * Once the user responds, a second spinner with "Processing response..." is displayed
   * until the async onResponse work is complete.
   *
   * @param message The prompt message to display.
   * @param bindResponseHandler If true, invokes the onResponse handler.
   * @returns A promise that resolves with the user's response.
   */
  public async prompt(
    message: string,
    onResponse?: (response: string) => Promise<void> | void
  ): Promise<string> {
    // Clear any ongoing spinners so the user can reply.
    this.clearSpinner();

    const response = await new Promise<string>((resolve) => {
      this.rl.question(`\n${message}\n> `, (answer) => {
        resolve(answer);
      });
    });
    // Clear the waiting spinner.
    this.clearSpinner();

    if (onResponse) {
      // Start spinner while processing the user's response.
      this.spinnerInterval = this.startSpinner();
      await Promise.resolve(onResponse(response));
      this.clearSpinner();
    }

    return response;
  }

  /**
   * Closes the CLI messaging stream.
   */
  public close(): void {
    this.rl.close();
  }
}
