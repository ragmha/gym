// Original practice scripts, each about five minutes aloud. They follow the
// shape of Winston's "How to Speak": a promise, a fence, verbal punctuation,
// a question, a story, the core idea cycled, and a close on contributions.

export type SpeakingTopic = {
  id: string
  title: string
  tagline: string
  /** Top and bottom colours of the topic orb. */
  colors: [string, string]
  /** The three points to speak from in Solo mode. */
  points: string[]
  paragraphs: string[]
}

export const TOPICS: SpeakingTopic[] = [
  {
    id: 'agents',
    title: 'What an AI agent actually is',
    tagline: 'A model in a loop, with tools',
    colors: ['#E8F4FF', '#2F6FED'],
    points: [
      'An agent is a model in a loop, with tools, working toward a goal.',
      'The model proposes, the program disposes.',
      'Most of the power comes from feedback, not a bigger model.',
    ],
    paragraphs: [
      'In the next five minutes, you will learn what an AI agent actually is, and you will be able to explain it to anyone in a single sentence. Here is that sentence: an agent is a language model in a loop, with tools, working toward a goal. Hold on to it. A model in a loop, with tools, working toward a goal. By the end, every word in that sentence will mean something concrete to you.',
      'First, let me build a fence around the idea, because the word agent is used for almost everything right now. A chatbot is not an agent. A chatbot answers once and waits for you. Autocomplete is not an agent. It predicts the next few words and stops. A script that calls a model one time is not an agent either. The difference is the loop. An agent decides what to do next, does it, looks at what happened, and decides again, without you pressing enter every time.',
      'So let us take the sentence apart. There are four pieces: the model, the loop, the tools, and the goal. The model is the reasoning engine. It reads everything in its context and proposes the next step. On its own, it can only produce text. The loop is what turns text into progress. The program around the model takes the proposed step, runs it, captures the result, and feeds that result back in. Then it asks the model again: given what just happened, what now?',
      'The tools are how the agent touches the world. A tool is just a function with a name, a description, and inputs. Read a file. Run the tests. Search the documentation. Open a pull request. The model never runs anything itself. It asks for a tool by name, and the program decides whether to allow it. That boundary matters. It is where you put permissions, limits, and logging. If you remember one design rule, remember this one: the model proposes, the program disposes.',
      'And the goal is what tells the loop when to stop. Let me make this concrete with a story. I once asked an agent to fix a failing test. It read the test. It ran it and saw the error. It opened the function under test, noticed a date was parsed in the wrong time zone, changed one line, and ran the tests again. They passed, so it stopped and wrote me a summary. Five steps, one goal, and I did not touch the keyboard. Nothing in that story was magic. It was a model in a loop, with tools, working toward a goal.',
      'So here is a question for you. If the model is the same model you chat with every day, why does the agent feel so much more capable? Take a second before I answer. The answer is feedback. A chat gets one shot. An agent gets to see its mistakes. When the test fails, the failure becomes new context, and the next step is better informed. Most of the power is not in the model getting smarter. It is in the loop giving it evidence.',
      'That also tells you where agents fail. They fail when the feedback is weak: no tests, vague goals, tools that return nothing useful. They fail when the loop runs too long and the context fills with noise. So if you want a better agent, do not start by looking for a bigger model. Start by giving it sharper tools, clearer goals, and faster feedback.',
      'Let me close on what you now have. You have a one-sentence definition: a model in a loop, with tools, working toward a goal. You have a fence: a chatbot answers once, an agent iterates. You have a design rule: the model proposes, the program disposes. And you have a test for any product that calls itself an agent: where is the loop, and where is the feedback? Ask that question this week. You may be surprised how often the answer is nowhere.',
    ],
  },
  {
    id: 'small-prs',
    title: 'Why small pull requests win',
    tagline: 'Real reviews, not rubber stamps',
    colors: ['#F3E9FF', '#7C4DDB'],
    points: [
      'Small changes get real reviews. Big changes get rubber stamps.',
      'Small means one idea, not few lines.',
      'If the description needs the word "and", split it.',
    ],
    paragraphs: [
      'By the end of these five minutes, you will know why small pull requests ship faster, break less, and make you a better engineer, and you will have one rule you can use on your very next change. The core idea is simple: small changes get real reviews. Big changes get rubber stamps. Small changes get real reviews.',
      'Let me be precise about what I mean, because this is not about line counts. A small pull request is one idea. It can be a rename across fifty files, and that is still one idea. A large pull request is three ideas wearing one title: a refactor, a feature, and a bug fix you noticed along the way. The size that matters is the number of decisions a reviewer has to hold in their head at once.',
      'So here is my first question. When you last reviewed a two-thousand-line pull request, how carefully did you read line fifteen hundred? Be honest. Nobody does. Attention runs out long before the diff does. Reviewers start skimming, then trusting, then approving. That is not laziness. That is how attention works. Which is why small changes get real reviews, and big changes get rubber stamps.',
      'There are three reasons small pull requests win. First, review speed. A ten-minute review fits between meetings. A two-hour review waits until tomorrow, and then the day after. Small changes merge while the context is still fresh. Second, safety. When a small change breaks production, you know exactly which change did it, and you can roll it back without losing a week of unrelated work. Third, and this is the one people miss, small pull requests change how you think. To split work into small steps, you have to understand it first.',
      'Let me tell you how I learned this. Early in my career I spent two weeks on a feature branch. I rewrote the data layer, added the feature, and cleaned up every file I touched. The pull request had forty files and one reviewer. It sat for four days. When it finally merged, a payment report broke, and it took a full day just to find which of the forty files caused it. The bug was one line. The cost was the other thirty-nine files hiding it.',
      'So what do you actually do differently? Here is the rule: if you cannot describe the change in one sentence without the word and, split it. Rename the function, and add the feature, and fix the bug? That is three pull requests. Land the rename first; it is boring and safe. Land the bug fix with a test. Then the feature arrives on clean ground, and its review is only about the feature. Each step leaves the main branch working. That is the whole discipline.',
      'You might be thinking that this creates more overhead: more branches, more descriptions, more waiting. It does at first. But notice where the time goes. Ten small reviews take less total time than one big review, because no one has to rebuild the whole picture from scratch. And the waiting shrinks, because small things are easy to say yes to.',
      'Here is what you leave with. A definition: small means one idea, not few lines. A reason: small changes get real reviews, big changes get rubber stamps. And a rule you can use today: if your description needs the word and, split it. Try it on your next change, and notice how fast the review comes back.',
    ],
  },
  {
    id: 'web-request',
    title: 'How a web request travels',
    tagline: 'A series of handoffs',
    colors: ['#FFF3E0', '#E8833A'],
    points: [
      'A web request is a series of handoffs.',
      'Name, connection, edge, application, and the trip back.',
      'Measure each handoff before you optimize any of them.',
    ],
    paragraphs: [
      'In the next five minutes, you will follow a single click from your browser to a server and back, and you will be able to explain every hop to a new engineer on your team. The big idea is that a web request is a series of handoffs, and every handoff can add delay or fail. A series of handoffs. Keep that picture in mind.',
      'This is not a talk about any particular framework. A single-page app or a static page, the journey underneath is the same. And it is not about networking theory. We will skip the layer diagrams. We will follow one request, step by step, the way you would trace a bug.',
      'Step one is the name. You typed a domain, but computers route to addresses. So the browser asks DNS: where does this name live? The answer is usually cached nearby, in the browser, the operating system, or your router. When it is not, the question travels to resolvers that may be far away. That is your first handoff, and your first place to lose time.',
      'Step two is the connection. The browser opens a connection to that address and then negotiates TLS, agreeing on keys so nobody in between can read the traffic. That handshake costs round trips, which is why reusing connections matters so much. Step three is the edge. Most requests today do not go straight to your server. They reach a content delivery network first, a server physically close to the user. If the response is cached there, the journey ends early and fast. If not, the edge forwards it.',
      'Step four is your application. A load balancer picks one of your servers. Your code runs. It probably calls a database, maybe another service, maybe a cache. Each of those calls is another handoff, and another chance for delay.',
      'Let me ask you something. When a page feels slow, where do you look first? Most of us open the application code, because that is the part we wrote. But often the time is somewhere else: a lookup that is not cached, a new handshake on every request, or a cache that never hits. If you remember the series of handoffs, you check each one instead of guessing.',
      'I learned this the hard way. My team once spent two days optimizing a slow database query. We cut it from eighty milliseconds to ten. The page did not get faster. Then someone opened the browser network panel and saw that every request was opening a new connection and paying the full handshake each time. One configuration change to keep connections alive fixed it. We had optimized the handoff we understood, not the one that was slow.',
      'Finally, step five is the return trip. The response travels back through the same chain and into the browser, which parses the page, discovers more files it needs, and starts several more journeys just like this one. One click is rarely one request. It is a small parade of them.',
      'So here is what you now have. A picture: a web request is a series of handoffs. A map of those handoffs: name, connection, edge, application, and the trip back. And a debugging habit: measure each handoff before you optimize any of them. Next time a page is slow, open the network panel first, and follow the parade.',
    ],
  },
  {
    id: 'explain-work',
    title: 'Explaining your work to non-engineers',
    tagline: 'Problem first, system second',
    colors: ['#E6FFF4', '#21A672'],
    points: [
      'Problem first, system second.',
      'Pain, change, how. Usually you never need the how.',
      'If you cannot find the pain, check whether the work matters.',
    ],
    paragraphs: [
      'By the end of these five minutes, you will be able to explain any technical project to someone outside engineering in under a minute, without losing them and without talking down to them. The core idea: start with the problem they feel, not the system you built. Problem first, system second.',
      'This is not about dumbing things down. Simplifying is removing what does not matter to this listener. Dumbing down is removing what does. Your manager’s manager, a customer, your family at dinner: they are all smart. They just do not share your vocabulary, and they do not owe you their patience.',
      'Let me show you the mistake first. A friend once asked me what I was working on. I said I was migrating our event pipeline from batch processing to streaming. I watched her eyes glaze over in about four seconds. A week later someone else asked the same question, and I said: you know how your bank sometimes shows a payment a day late? I am working on making that show up within a second. She asked three follow-up questions. Same project. Different starting point.',
      'So here is the shape I use now, in three parts. First, the pain. Describe something the listener has felt or seen: waiting, confusion, a mistake, a cost. Second, the change. Say what is different after your work, in their words, not yours. Third, the how, but only one level deep, and only if they ask. Pain, change, how. Most of the time you never reach part three, and that is fine. The conversation has already worked.',
      'Try it right now, in your head. What is the pain your current project removes, and who feels it? If you struggled to answer, that is worth noticing. Sometimes the hardest part of explaining your work is discovering that you have only ever described it in terms of the system. Finding the pain is not just a communication trick. It is a check on whether the work matters.',
      'Analogies help, but choose carefully. A good analogy maps the one thing that matters and ignores the rest. A cache is like keeping the milk in the fridge door instead of walking to the shop. That works because it is about distance and speed. Do not stretch it to explain expiry and memory limits. One analogy, one idea, then let it go.',
      'And watch the listener, not your notes. If they lean in, go one level deeper. If they look away, go back to the pain. The goal is not to say everything you know. The goal is for them to leave knowing one thing they did not know before, and wanting to ask you about it.',
      'So here is what you are taking with you. One principle: problem first, system second. One shape: pain, change, how. And one test: if you cannot find the pain, check whether the work matters. The next time someone asks what you do, try it. Start with something they have felt, and watch the conversation open up.',
    ],
  },
]
