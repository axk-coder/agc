# agc

A graphical desktop interface for Antigravity CLI styled after the Claude desktop application.

## Overview

agc provides a native Linux graphical desktop interface for the Antigravity CLI (agy). It replicates the layout, sidebar, typography, color palette, and styling of the Claude app while interfacing directly with Antigravity backend data and conversations. Both agy and agc remain independently available.

## Features

- Native GTK WebKit2 desktop window with automatic fallback to Chrome application mode.
- Claude-styled editorial layout with terracotta star asterisk, time-of-day greeting, and floating prompt card.
- Real Antigravity conversation history loaded dynamically from conversation_summaries.db.
- Active chat view with message rendering, syntax-highlighted code blocks, and tool execution status.
- Strict security design: loopback binding only (127.0.0.1), UUID path traversal prevention, and shell-less subprocess execution.
- Original agy CLI binary remains untouched.

## Usage

Launch the graphical interface:
```bash
agc
```

Run in terminal CLI mode:
```bash
agc --cli
```

Original Antigravity CLI remains untouched:
```bash
agy
```

## Credits

- Anthropic (Claude App interface design and aesthetic)
- Google DeepMind (Antigravity CLI backend engine)

## Policies

- Privacy Policy: All queries and transcript histories run locally on your device.
- Terms of Service: Distributed under the MIT license.
