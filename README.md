# agc

A Claude Code terminal wrapper for Antigravity CLI.

## Overview

agc wraps the Antigravity CLI (agy) to provide Anthropic's Claude Code visual styling, command conventions, and grayscale interface while maintaining full underlying Antigravity features. Both agy and agc remain independently available.

## Features

- Preserves original agy binary intact.
- Seamless Claude Code styling and presentation.
- Automatic grayscale ANSI filter for clean interface aesthetic.
- Argument compatibility for Claude Code CLI flags (-c, -p, prompt arguments, resume).
- Full PTY multiplexing with dynamic window resize forwarding.

## Usage

Interactive mode:
```bash
agc
```

Interactive mode with initial prompt:
```bash
agc "review this repository"
```

Continue previous conversation:
```bash
agc -c
```

Resume specific session:
```bash
agc -r <conversation-id>
```

Non-interactive print mode:
```bash
agc -p "generate a quick sort in python"
```

Standard Antigravity CLI remains untouched:
```bash
agy
```

## Credits

- Anthropic (Claude Code CLI interface design and architecture)
- Google DeepMind (Antigravity CLI and Gemini models)
