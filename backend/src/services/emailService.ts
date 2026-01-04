import nodemailer from "nodemailer";
import dotenv from "dotenv";

import path from "path";
// Fix path: src/services -> src -> backend -> root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private fromAddress: string = "Agent 7715 <agent@example.com>";

    constructor() {
        this.init();
    }

    private init() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            this.fromAddress = process.env.SMTP_FROM || `Agent 7715 <${process.env.SMTP_USER}>`;
            console.log("[EmailService] Initialized with host:", process.env.SMTP_HOST);
        } else {
            console.warn("[EmailService] SMTP credentials missing. Email notifications disabled.");
        }
    }

    async sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
        if (!this.transporter) {
            console.log("[EmailService] Skipped email (no transporter):", subject);
            return false;
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to,
                subject,
                html: htmlBody,
            });
            console.log("[EmailService] Email sent:", info.messageId);
            return true;
        } catch (error) {
            console.error("[EmailService] Error sending email:", error);
            return false;
        }
    }

    private getBaseHtml(title: string, content: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #e4e4e7; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; margin-top: 20px; }
                .header { background-color: #10b981; color: #000; padding: 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                .content { padding: 30px; }
                .card { background-color: #27272a; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
                .label { font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .value { font-size: 16px; color: #fff; font-weight: 500; word-break: break-all; }
                .footer { background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; }
                .btn { display: inline-block; background-color: #10b981; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; color: #a1a1aa; font-size: 12px; padding-bottom: 8px; border-bottom: 1px solid #3f3f46; }
                td { padding: 10px 0; border-bottom: 1px solid #3f3f46; color: #e4e4e7; vertical-align: top; }
                .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                .success { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
                .skipped { background-color: rgba(113, 113, 122, 0.2); color: #a1a1aa; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${title}</h1>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    <p>Agent 7715 | Automated Trading System</p>
                    <p>Powered by ERC-7715 & MetaMask</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async sendAgentActivation(to: string, strategies: any[]): Promise<void> {
        const subject = "🤖 Agent Activated Successfully";
        const strategiesHtml = strategies.map(s => `
            <div class="card">
                <div class="label">Strategy Type</div>
                <div class="value">${s.strategy}</div>
                <div style="margin-top: 10px;">
                    <div class="label">Configuration</div>
                    <pre style="background: #000; padding: 10px; border-radius: 4px; font-size: 12px; color: #a1a1aa; overflow-x: auto;">${JSON.stringify(s.params, null, 2)}</pre>
                </div>
            </div>
        `).join("");

        const content = `
            <p style="font-size: 16px; margin-bottom: 20px;">Your autonomous agent is now <strong>active</strong> and monitoring the market.</p>
            <h3>Active Strategies</h3>
            ${strategiesHtml}
            <div class="card" style="margin-top: 20px; border-left: 4px solid #10b981;">
                <div class="label">Next Steps</div>
                <div class="value" style="font-size: 14px; margin-top: 5px;">
                    The agent will execute trades automatically based on these parameters. You will receive an email for every trade execution.
                </div>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/dashboard" class="btn">View Dashboard</a>
            </div>
        `;

        if (to) await this.sendEmail(to, subject, this.getBaseHtml("Agent Activated", content));
    }

    async sendTradeExecution(to: string, strategy: string, txHash: string, details: string): Promise<void> {
        const subject = `🚀 Trade Executed: ${strategy}`;

        // Parse details slightly better if it's JSON-like, otherwise plain text
        let detailsHtml = `<div class="value">${details}</div>`;

        const content = `
            <p style="font-size: 16px; margin-bottom: 20px;">A trade has been successfully executed by your agent.</p>
            
            <div class="card">
                <div class="label">Strategy</div>
                <div class="value" style="color: #10b981; font-size: 18px;">${strategy}</div>
            </div>

            <div class="card">
                <div class="label">Transaction Details</div>
                ${detailsHtml}
            </div>

            <div class="card">
                <div class="label">Transaction Hash</div>
                <div class="value" style="font-family: monospace; font-size: 12px;">${txHash}</div>
                <a href="https://sepolia.etherscan.io/tx/${txHash}" style="display: inline-block; margin-top: 8px; color: #10b981; font-size: 12px; text-decoration: none;">View on Etherscan &rarr;</a>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/dashboard" class="btn">View Agent Portfolio</a>
            </div>
        `;

        if (to) await this.sendEmail(to, subject, this.getBaseHtml("Trade Executed", content));
    }

    async sendHourlyStatus(to: string, userAddress: string, activations: any[], skipped: any[]): Promise<void> {
        const subject = `⏱️ Hourly Status Report`;

        let executedHtml = "";
        if (activations.length > 0) {
            executedHtml = `
                <h3 style="margin-top: 0;">✅ Executed Trades (${activations.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Strategy</th>
                            <th>Tx Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activations.map(a => `
                            <tr>
                                <td><span class="status-badge success">${a.strategy}</span></td>
                                <td><a href="https://sepolia.etherscan.io/tx/${a.txHash}" style="color: #10b981;">${a.txHash.substring(0, 10)}...</a></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                <br/>
            `;
        } else {
            executedHtml = `<div class="card" style="text-align: center; color: #71717a;">No trades executed this hour.</div>`;
        }

        let skippedHtml = "";
        if (skipped.length > 0) {
            skippedHtml = `
                <h3>zzz Skipped / Checks (${skipped.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Strategy</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${skipped.map(s => `
                            <tr>
                                <td><span class="status-badge skipped">${s.strategy}</span></td>
                                <td style="font-size: 13px; color: #a1a1aa;">${s.reason}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }

        const content = `
            <div class="card">
                <div class="label">Account</div>
                <div class="value" style="font-family: monospace; font-size: 14px;">${userAddress}</div>
            </div>

            ${executedHtml}
            ${skippedHtml}

            <p style="font-size: 12px; color: #71717a; margin-top: 20px; text-align: center;">
                This automated report summarizes your agent's activity over the last hour.
            </p>
        `;

        if (to) await this.sendEmail(to, subject, this.getBaseHtml("Hourly Status", content));
    }
}

export const emailService = new EmailService();
