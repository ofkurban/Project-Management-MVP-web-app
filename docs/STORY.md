# The story of Kanban Studio

How we built a local Kanban app with AI help — one step at a time.

---

## The beginning

We wanted a simple project board you can run on your own computer: sign in, move cards, and ask an AI assistant to help update the board. We did not build everything at once. We followed a story with ten chapters. Each chapter unlocked the next.

---

### Chapter 1 — Plan

**So we don’t build randomly.**

Before writing much code, we wrote down what the app should do, what it should not do, and in what order we would build it. We locked choices like “one board per user,” “free AI only,” and “run in Docker.”

That plan became our map. When something was unclear, we checked the map instead of guessing.

---

### Chapter 2 — Docker + backend shell

**So the app runs reliably.**

We built a small FastAPI server inside Docker, plus start and stop scripts. At first the app only said “Hello world” and answered a health check.

Why start so small? Because if the house has no foundation, fancy furniture does not help. Once Docker ran the same way every time, we could add features with confidence.

---

### Chapter 3 — Kanban UI

**So you see the real board.**

We took the Kanban frontend, built it as static files, and served it from FastAPI. Opening the app now showed columns and cards instead of a hello page.

The product became visible. You could drag cards and rename columns — still only in the browser’s memory for now.

---

### Chapter 4 — Login

**So the board isn’t open to everyone.**

We added a sign-in screen. The demo account is `user` / `password`. A session cookie keeps you signed in until you log out.

Without login, anyone who opened the site would see the board. Login also prepared us to save “this user’s board” later.

---

### Chapter 5 — Database design

**So we know how to save data.**

We designed a simple SQLite layout: a users table, and one board per user stored as JSON (the same shape the frontend already used).

We agreed on the design before coding it. That way we did not invent a new storage format halfway through.

---

### Chapter 6 — Board API

**So the server can store the board.**

The backend learned to create the database if it was missing, seed the demo user and sample board, and expose read/write board endpoints for a signed-in user.

The server finally had a place to keep work — not just the browser tab.

---

### Chapter 7 — Connect UI to DB

**So refresh keeps your work.**

After login, the app loads the board from the server. When you change cards or columns, it saves automatically. We also made sure cards could be edited in place.

This is the moment the demo became a real app: close the tab, come back, and your board is still there.

---

### Chapter 8 — Free AI test

**So we know the AI key works.**

We connected OpenRouter using a free model and ran a tiny test: ask “what is 2+2?” and check that the answer makes sense.

No chat UI yet. First prove the key, the model, and the network path. If that fails, a fancy sidebar will not save you.

---

### Chapter 9 — Smart chat API

**So AI can safely update the board.**

We built a chat endpoint that sends your message, conversation history, and the current board. The AI replies with structured data: a message for you, and optionally a full updated board.

Structure matters. Free-form chat is easy; trusted board updates need a clear format the server can validate and save.

---

### Chapter 10 — Chat sidebar

**So you can use AI in the app.**

We added the chat panel beside the board. You type in plain language. Replies appear in the sidebar. If the AI changes the board, the Kanban refreshes right away.

That closes the story: plan → reliable shell → board → login → save → AI → a feature people can actually use.

---

## The ending (for now)

Today you can:

1. Start the app with Docker  
2. Sign in  
3. Manage a Kanban board that persists  
4. Ask the AI assistant for help  

Code lives on GitHub:  
https://github.com/ofkurban/Project-Management-MVP-web-app  

Run it locally at:  
http://localhost:8000  

Demo login: `user` / `password`
