---
title: Overview
description: Let an AI agent pay or trade from your wallet within an allowance you set, with every transfer approved by your face and verified on-chain.
---

# YID Gate

Let an AI agent pay or trade from your wallet **without holding your keys**. The agent
asks, you approve with your face in the YID app, and a contract on Base verifies your
signature on-chain before it spends from an allowance you set. Nothing leaves your
wallet until then.

Gate is live on Base mainnet and works in Claude, Cursor, or any MCP client.

## How it works

Money and permission never share one address.

| Party | What it does | What it holds |
| --- | --- | --- |
| Your wallet | Keeps every asset. Grants the gate an allowance per token, and a list of contracts an agent may use. Signs setup, never a transfer. | Your funds |
| Your face | A biometric scan in the YID app signs the exact transfer or trade. That signature is the only thing the gate trusts. | Your signing key, on your phone |
| The agent | A gas wallet. It proposes and submits what you approved, byte for byte. | Gas only. It cannot spend. |

One transfer takes four steps:

1. **Agent asks.** A transfer, or a call to a contract you allowed, such as a swap or a
   deposit. The gate simulates it first.
2. **Phone rings.** You see what you send and what you receive.
3. **You scan.** Your biometric key signs the decision. Reject is final.
4. **Gate executes.** The signature is verified on-chain, the nonce is burned, and the
   asset moves or the trade runs. Leftovers come back to you. Replays fail.

## Quickstart

### 1. Set up your gate

Open [YID Gate](https://gate.yanez.ai/app/). Connect your wallet, link your YID, set an
allowance for each token the agent may spend, and allow any contracts it may call. This
takes about five minutes.

You need the YID app on your phone. See [Download](../download.md).

### 2. Get your agent key

In the YID app, go to **Settings → Agent Keys** and create a key. It starts with `yak_`.
This key can only ask you for approval; it cannot move funds.

### 3. Add the MCP server

Add Gate to your MCP client's config, for example `mcp.json` in Claude or Cursor:

```json
{
  "mcpServers": {
    "yid-wallet": {
      "type": "http",
      "url": "https://0xhound.com/mcp",
      "headers": { "Authorization": "Bearer yak_..." }
    }
  }
}
```

Nothing to install. Our relayer pays gas and submits approved transactions.

Keep the `yak_` key in this config or a secret manager. Never paste it into a prompt.

### 4. Ask your agent to pay

For example: *"Send 1 USDC to 0xFD22…2820 for the API invoice."* Your phone rings, you
review the transfer, and you approve it with a face scan. The transaction is usually
mined within about five seconds of your tap.

## MCP tools

| Tool | What it does |
| --- | --- |
| `wallet_status` | Returns balances, the remaining allowance, and the fee. |
| `wallet_request_transfer` | Proposes a transfer and rings your phone once. |
| `wallet_wait_authorization` | Waits for your decision: approve, reject, or expire. On approval, returns the transaction. |

The model never sees the approval receipt.

## Fees

| Mode | Who submits | Fee |
| --- | --- | --- |
| Use our relayer | Yanez pays gas and submits | 0.1% of the amount, fixed at deploy and shown on your phone |
| Run your own agent | A gas wallet you control. Only that address can submit. | None |

To run your own agent, point your gate record at a gas wallet you control. Setup
instructions for the self-hosted MCP server will be added here when its package is
published.

## What if something goes wrong

| If | What happens |
| --- | --- |
| The agent key is stolen | The thief can call the gate, but nothing moves without your scan. |
| Our server is hacked | It can ring your phone and burn gas. It holds no key the gate accepts. |
| Yanez is compromised | The gate checks your signature, not ours. We never had it. |
| The agent goes rogue | You see every request before it happens, and you tap reject. |
| The relayer disappears | Point your record at any gas wallet. One transaction, and the fee stops with it. |
| You lose your phone | Revoke the allowance from your wallet, then re-register on a new device. |

## Get help

Email <support@yanez.ai>. Never include a private key or your `yak_` key.
