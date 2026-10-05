## Behavioural patterns

Module 19 was about making and shaping objects. These six patterns are about **how objects cooperate and vary their behaviour**: swap an algorithm (Strategy), broadcast changes (Observer), reify requests (Command), fix a skeleton (Template Method), change behaviour with mode (State) and walk a collection (Iterator). Each section gives the intent, the structure, C++ and Python, how it collapses in Python and when to skip it.

## Strategy

**Intent:** make a family of algorithms interchangeable. **Problem:** `if method == "flat": ... elif method == "weight": ...` inside a shipping calculator.

~~~text
Context --has-a--> Strategy <|-- FlatRate, ByWeight
~~~

~~~cpp
struct ShippingStrategy {
    virtual ~ShippingStrategy() = default;
    virtual double cost(double kg) const = 0;
};
struct FlatRate : ShippingStrategy {
    double cost(double) const override { return 5.0; }
};
struct ByWeight : ShippingStrategy {
    double rate;
    explicit ByWeight(double r) : rate(r) {}
    double cost(double kg) const override { return kg * rate; }
};
struct Shipper {
    const ShippingStrategy& s;
    double quote(double kg) const { return s.cost(kg); }
};
~~~
~~~python
def flat_rate(kg): return 5.0
def by_weight(rate):
    return lambda kg: kg * rate      # a closure is a strategy

class Shipper:
    def __init__(self, strategy): self.strategy = strategy
    def quote(self, kg): return self.strategy(kg)
~~~

**In Python this often collapses to** passing a function. **When not to use it:** when there is one algorithm that never varies.

## Observer

**Intent:** when one object changes, notify any number of dependents without it knowing who they are. **Problem:** a model that hard-codes calls to every view.

~~~text
Subject --notifies--> Observer1, Observer2, ...
~~~

~~~cpp
class Subject {
    std::vector<std::function<void(int)>> observers_;
public:
    void subscribe(std::function<void(int)> f) { observers_.push_back(std::move(f)); }
    void set(int v) { for (auto& f : observers_) f(v); }
};
~~~
~~~python
class Subject:
    def __init__(self): self._observers = []
    def subscribe(self, fn): self._observers.append(fn)
    def set(self, v):
        for fn in list(self._observers): fn(v)
~~~

> **Pitfall:** the **lapsed listener** leak. The subject holds a strong reference to every observer, so an observer you "forgot" about can never be garbage collected or destroyed safely. Always provide `unsubscribe`, or hold observers weakly (`weakref.WeakSet`/`WeakMethod` in Python, `std::weak_ptr` in C++).

**In Python this often collapses to** a list of callables. **When not to use it:** when notification order matters or chains of observers trigger each other; the control flow becomes hard to follow.

## Command

**Intent:** turn a request into an object so it can be queued, logged, or **undone**. **Problem:** a text editor whose buttons call methods directly can never undo.

~~~text
Invoker(History) --> Command{execute, undo} --> Receiver(Editor)
~~~

~~~cpp
struct Command { virtual ~Command() = default; virtual void execute() = 0; virtual void undo() = 0; };
struct Append : Command {
    std::string& text; std::string s;
    Append(std::string& t, std::string s) : text(t), s(std::move(s)) {}
    void execute() override { text += s; }
    void undo() override { text.erase(text.size() - s.size()); }
};
std::vector<std::unique_ptr<Command>> undoStack;
~~~
~~~python
class Append:
    def __init__(self, doc, s): self.doc, self.s = doc, s
    def execute(self): self.doc.text += self.s
    def undo(self): self.doc.text = self.doc.text[:-len(self.s)]

undo_stack, redo_stack = [], []
def run(cmd):
    cmd.execute(); undo_stack.append(cmd); redo_stack.clear()
~~~

`undo` pops from the undo stack and pushes onto the redo stack; `redo` does the reverse. Running a *new* command must clear the redo stack, since the future it described no longer exists.

**When not to use it:** when no queueing, logging or undo is needed, a plain method call is clearer.

## Template Method

**Intent:** define the skeleton of an algorithm in a base class and let subclasses fill in steps. **Problem:** two importers share 80% of their code.

~~~text
Base.run() { step1(); hook(); step3(); }   Sub overrides hook()
~~~

~~~cpp
class Report {
public:
    void run() const { header(); body(); footer(); }   // the skeleton
    virtual ~Report() = default;
protected:
    virtual void body() const = 0;
    virtual void header() const { std::cout << "== report ==\n"; }
    virtual void footer() const {}
};
~~~
~~~python
class Report:
    def run(self):                    # the skeleton
        self.header(); self.body(); self.footer()
    def header(self): print("== report ==")
    def body(self): raise NotImplementedError
    def footer(self): pass
~~~

**Template Method vs Strategy:** Template Method varies steps through **inheritance** (fixed at compile time, per class); Strategy varies the whole algorithm through **composition** (swappable at run time). Prefer Strategy when you need to change behaviour on an existing object or avoid deep hierarchies.

## State

**Intent:** let an object change its behaviour when its internal state changes by delegating to a state object. **Problem:** a `switch (state)` repeated in every method.

~~~text
Context --has-a--> State <|-- Green, Yellow, Red   (each decides the next state)
~~~

~~~cpp
struct Light;
struct State { virtual ~State() = default; virtual std::unique_ptr<State> next() const = 0; virtual std::string name() const = 0; };
struct Red : State {
    std::unique_ptr<State> next() const override;
    std::string name() const override { return "red"; }
};
struct Green : State {
    std::unique_ptr<State> next() const override { return std::make_unique<Red>(); }
    std::string name() const override { return "green"; }
};
std::unique_ptr<State> Red::next() const { return std::make_unique<Green>(); }
~~~
~~~python
class Green:
    name = "green"
    def next(self): return Red()
class Red:
    name = "red"
    def next(self): return Green()

class Light:
    def __init__(self): self.state = Green()
    def advance(self): self.state = self.state.next()
~~~

State and Strategy look alike; the difference is intent: strategies are chosen by the client, while states **change themselves** as events occur.

## Iterator

**Intent:** traverse a collection without exposing its representation.

~~~cpp
class Countdown {
    int n_;
public:
    explicit Countdown(int n) : n_(n) {}
    struct It {
        int v;
        int operator*() const { return v; }
        It& operator++() { --v; return *this; }
        bool operator!=(const It& o) const { return v != o.v; }
    };
    It begin() const { return {n_}; }
    It end() const { return {0}; }
};
for (int i : Countdown(3)) { /* 3 2 1 */ }
~~~
~~~python
class Countdown:
    def __init__(self, n): self.n = n
    def __iter__(self):               # a generator: re-iterable
        for i in range(self.n, 0, -1):
            yield i

for i in Countdown(3): ...            # 3 2 1
~~~

> **C++ vs Python:** range-`for` needs `begin()`/`end()` returning something with `*`, prefix `++` and `!=`. Python's `for` calls `iter()`, then `__next__` until `StopIteration`. A generator function gives you both protocols for free and is **lazy**: nothing runs until the next value is requested.

## Choosing, and not over-using

Start from the force: swappable algorithm (Strategy), one-to-many notification (Observer), undo or queues (Command), shared skeleton (Template Method), mode-dependent behaviour (State), custom traversal (Iterator). If you cannot name the force, you do not need the pattern.

## Key takeaways

- Strategy swaps algorithms by composition; in Python a function or closure is enough.
- Observer decouples publishers from subscribers; always allow unsubscribe to avoid lapsed-listener leaks.
- Command objects make requests storable, loggable and undoable via undo/redo stacks.
- Template Method fixes the skeleton in a base class; Strategy replaces the whole algorithm.
- State replaces a repeated switch with objects that choose the next state.
- Iterators: begin/end plus range-for in C++; `__iter__`/`__next__` or generators in Python.
- A pattern is justified by a concrete force, not by its name.

## Common pitfalls

- Using inheritance (Template Method) when composition (Strategy) would do.
- Forgetting to unsubscribe observers, or mutating the observer list during notification.
- Not clearing the redo stack after a new command.
- Building a State machine for two states that never change.
- Treating a one-shot iterator as re-iterable.
