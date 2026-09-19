# 🏈 Pickr

**Your own RedZone for college football.** One page watches every game at once, figures out where the action is, and puts that game up front. Add the little Chrome extension and it turns your screen into a real video wall of your own streams, moving the big screen and the sound to whichever game is about to pop.

👉 **Open the board:** https://spencer-klue.github.io/pickr/

No account. No sign-up. Nothing to pay. It just works in your browser.

---

## What it does, in one breath

Saturday, 3:30 pm. Twelve games on. You can't watch twelve games. Pickr can. Every few seconds it reads the live scoreboard, scores every game on how spicy it is right now (red zone? tied? fourth quarter, one-score game?), and picks a **lead game**. When something better breaks out, it switches to it and chimes if you want it to.

That's the **board**, and it works anywhere, on anything, with no install.

If you also install the **wall extension**, the board can open your actual streams (ESPN, FOX, Peacock, and so on, using *your* logins) as tiles on your screen. The lead game gets the big tile and the sound. When the director switches, your screen switches too. That's the part that feels like magic.

---

## Get set up in five minutes

### Step 1: Open the board

Go to https://spencer-klue.github.io/pickr/ in Chrome. Bookmark it. That's it, you have the board. You can stop here and already have a great second-screen for game day.

### Step 2 (optional, but the fun part): Install the wall extension

The wall needs a tiny Chrome extension. It isn't in the Chrome Web Store, so you install it by hand once. It takes about a minute.

1. On this page, click the green **Code** button near the top right, then **Download ZIP**.
2. Unzip it. Inside you'll find a folder called **`extension`**. Remember where it is.
3. In Chrome, go to the address `chrome://extensions` (type it in the address bar).
4. Flip on **Developer mode** (a switch in the top right corner).
5. Click **Load unpacked** and pick that **`extension`** folder.
6. Go back to the board and refresh the page. The "Video wall" box should now say the extension is connected.

**Mac, Windows, Linux:** all the same steps. It has to be Chrome (or a Chrome-based browser like Brave or Edge). Safari and Firefox can't run it.

**Got an AI helper?** If you use Claude Code or something like it, you can literally paste this: *"Clone https://github.com/spencer-klue/pickr and help me install the Chrome extension from the extension folder."* It'll get you to the Load unpacked step. The last click is yours, because Chrome insists.

### Step 3: Tell it what you can watch

In the "Video wall" box there's a row of channel chips under **Channels I can watch here**. Click the ones you *don't* have to grey them out. That way the director never sends you to a game on a channel you can't open. Chrome remembers your choices.

### Step 4: Open the wall

Sign in to your streaming services in Chrome the way you normally would (ESPN, FOX, Peacock, Paramount+, Xfinity, whatever you've got). Then hit the big red **Open wall** button. Your screen fills with the top games. Sit back.

---

## A tour of the board

Here's what everything on the page is for, top to bottom.

### The top bar
- **Live now / Today / Updated**: how many games are on right now, how many kick off today, and when the board last checked the scoreboard.
- **Small schools: off/on**: flip on to include FCS games too (the smaller Division I schools: Montana, North Dakota State, the Ivies). Off by default so the board stays about the big slate.
- **Sound: off/on**: a short chime whenever the director changes the lead game. Handy if you're in the kitchen.
- **Updated**: when the board last checked, how long ago that was, and a countdown to the next check. The thin green line under the header is the same countdown.
- **The last pill** tells you where the scores are coming from. "live feed" is good. "delayed feed" means ESPN is handing your network a cached copy that can be a few minutes old (it happens if a network hits ESPN too hard; it clears on its own). "snapshot" means the board couldn't reach the scoreboard at all and is showing you the last picture it saved.

### On the call
The big red panel. This is the lead game, the one the director thinks you should be watching *right now*. You'll see the score, clock, who has the ball, the last play, a win-probability bar, and a **Watch** button that opens the broadcaster's own player.

The red bar across the top tells you *why* it picked this game: "Red zone", "FG game", "Crunch time", "Overtime". Those little tags are the director's reasoning, out loud.

### Pick order
The list on the right is every live game, ranked hottest to coldest. The coloured stripe on the left of each tile is the heat: red is must-see, orange is warming up, grey is a wait-and-see.

Each tile shows the score, the clock as of the last play, the channel, and how long ago that game last changed. A tile glows when a play comes in and flashes red when someone scores. The clock doesn't tick on its own, on purpose: ESPN reports the clock at the last play, and a football clock stops so often that a fake ticking clock would be wrong half the time.

**Click any game to pin it as the lead.** Pinned means "stay here, I don't care what else happens." Click it again, or hit **Release pin**, to hand control back to the auto director. Pregame tiles show you the countdown to kickoff.

### Video wall (needs the extension)
The control room for your screen.

- **Layout**: *Big lead + rail* gives the lead game a huge tile with the rest lined up beside it. *Even grid* makes every tile the same size.
- **Panes**: how many streams to open at once. Start with 4. Your Wi-Fi and your laptop fan will tell you when you've gone too far.
- **Auto-pick**: when this is on, the director changes what's on your wall as games heat up and cool down. Off means the wall stays put and only the board changes.
- **Lead to front**: the lead game always takes the big tile.
- **Video only**: strips everything off the broadcaster's page except the video. Highly recommended.
- **TNT/USA/CBSSN via Xfinity Stream**: some cable channels won't play in a browser from their own sites anymore. With this on, the wall opens them through Xfinity Stream instead, and you pick the channel once per tile.
- **Pane**: *Borderless* windows look like a real wall. *With address bar* is handy if a stream needs a login click.
- **Board**: put the board itself on the wall as a strip down the right edge, for a single-screen setup.
- **Open wall / Close wall**: the big buttons. Open fills the wall with the top games. Close shuts every tile at once.

**Sound** has three moods:
- *follows main*: the sound is always on the lead game.
- *follows mouse*: hover over a tile to hear it. Great for browsing.
- *where I put it*: you pick a tile's 🔊 and it stays there.

Once the wall is open, each stream gets a chip in this box. From the chip you can **swap** the game in that tile, give it the **🔊** sound, make it the **★** main screen, or **✕** close it. Or just move your mouse to the top edge of any tile and the same controls appear right there.

**Add pane** opens one more stream for a game you choose. **Save this wall** remembers today's lineup so you can bring it back after a refresh. (Saved walls are for the same day; the channel chips are the setting that lasts.)

### My bets
Got action on a game? Add it here (spread, total, moneyline, or "other") and the board shows how your bet is doing on every tile, in the lead panel, and on the kickoff board. Tick **rank my games hotter** and the director gives a little extra weight to games you've got money on. There's also a paste box: copy your "My Bets" page from DraftKings, FanDuel, or BetOnline, paste it, and it pulls out the straight bets for you.

Bets live only in your browser. Nobody else sees them, and nothing is sent anywhere.

### Lines desk
Live lines (spread, total, moneylines) for the games that matter to you: live games, games you have bets on, and the pinned game. The **Movement** log shows you when a line moves. Set an **alert** ("tell me when the total drops to 48") and the row lights up when it hits.

The numbers are DraftKings lines as published by ESPN. They're for reference. Place bets in your own sportsbook app.

### Kickoff board
The whole day's slate, grouped by kickoff time, with rankings, network, and a **Watch** link on each game. It's your "what's coming up next" view.

### Finals
Tucked away at the bottom. Click to see today's final scores.

---

## How the director thinks

No secrets here. Every live game gets points for:

- **Red zone**: the biggest boost. That's the whole point of the thing.
- **Score**: tied, a field-goal game, or a one-score game all score high. A blowout scores negative.
- **Clock**: fourth quarter is worth something. Under five minutes in a one-score game is "crunch time" and jumps the queue. Overtime beats nearly everything.
- **Fourth down**: small bump.
- **Rankings**: a Top-25 matchup gets extra love.
- **Win probability**: the closer to a coin flip, the better.
- **Halftime**: penalty. Nobody wants to watch the band.
- **Your bets**: optional bump if you've turned it on.

Highest score wins the lead. It re-thinks every few seconds.

---

## When something looks off

- **"Video wall: install the extension"** even though you did: refresh the board page. If you ever update or reload the extension, the page loses its connection and a refresh fixes it.
- **Tiles open but the video won't play / is muted:** Chrome blocks autoplay with sound until you've clicked in a page. Click once inside a tile and you're good. Streams also occasionally want a fresh login; switch **Pane** to *With address bar* for that one.
- **A stream opens on a listing page instead of the game:** click the game on that page. "Video only" kicks in once a live player is on screen.
- **Nothing shows up in the wall for a game:** its channel is probably greyed out in **Channels I can watch here**, or the network isn't one the wall knows how to open.
- **The lead keeps jumping around:** pin a game, or turn off **Auto-pick** and let the board do the thinking while your wall stays put.

---

## The fine print

- Pickr never rehosts video. Every stream is the broadcaster's own page, in your own browser, with your own login. The extension only arranges windows and hides page clutter.
- Scores and lines come from ESPN's public scoreboard.
- Everything you set (channels, bets, alerts, saved walls) is stored in your browser and never leaves it.
- Free to use, free to copy, free to tinker with. MIT licence.

---

## For the tinkerers

You don't need any of this to use Pickr. It's here for the curious.

```
docs/index.html            the board, as published (GitHub Pages serves this folder)
src/index.template.html    the board's source, with a __SNAPSHOT__ placeholder
build.py                   fetches the scoreboard and bakes a fresh snapshot into docs/index.html
extension/                 the Chrome extension (manifest, background worker, board relay, video-only mode)
run-linux.sh               Spencer's launcher: local server on :8787 + Chrome for Testing with the extension
chrome-wall.sh             starts your normal Chrome with autoplay relaxed and opens the board
```

- Rebuild the offline snapshot: `python3 build.py` (Python 3, no extra packages).
- Run it locally instead of from GitHub Pages: serve the `docs` folder on port 8787 (`cd docs && python3 -m http.server 8787`). The extension already allows `localhost:8787`.
- Hosting your own copy? The extension's board relay allows any `*.github.io` or `*.netlify.app` page. Add your own domain to `content_scripts[0].matches` in `extension/manifest.json`.
- The board talks to the extension through `window.postMessage`; the relay only wakes up on pages that carry `<meta name="pickr">`.
