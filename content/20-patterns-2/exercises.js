export default [
  {
    id: 'patterns-2-e01', lang: 'cpp', title: 'Event bus (Observer)', difficulty: 2,
    task: `Implement an **Observer**-style \`EventBus\`.

- \`int subscribe(const std::string& topic, std::function<void(const std::string&)> handler)\` registers a handler and returns a **unique id** (ids start at 1 and increase).
- \`void unsubscribe(int id)\` removes that handler; an unknown id is ignored.
- \`int publish(const std::string& topic, const std::string& message)\` calls every handler subscribed to exactly that topic, in subscription order, and returns how many handlers were called.

~~~cpp
EventBus bus;
std::vector<std::string> got;
int id = bus.subscribe("news", [&](const std::string& m) { got.push_back(m); });
bus.publish("news", "hello");   // returns 1, got == {"hello"}
bus.unsubscribe(id);
bus.publish("news", "again");   // returns 0
~~~`,
    starter: `#include <functional>
#include <string>

class EventBus {
public:
    int subscribe(const std::string& topic, std::function<void(const std::string&)> handler) {
        return 0;  // TODO
    }
    void unsubscribe(int id) {}  // TODO
    int publish(const std::string& topic, const std::string& message) {
        return 0;  // TODO
    }
};
`,
    tests: [
      { name: 'ids are unique and increasing', code: `EventBus bus;
int a = bus.subscribe("t", [](const std::string&) {});
int b = bus.subscribe("t", [](const std::string&) {});
EXPECT(a >= 1);
EXPECT(b > a);` },
      { name: 'publish reaches matching subscribers only', code: `EventBus bus;
std::vector<std::string> a, b;
bus.subscribe("x", [&](const std::string& m) { a.push_back(m); });
bus.subscribe("y", [&](const std::string& m) { b.push_back(m); });
EXPECT_EQ(bus.publish("x", "one"), 1);
EXPECT_EQ(a.size(), std::size_t(1));
EXPECT_EQ(a[0], std::string("one"));
EXPECT(b.empty());
EXPECT_EQ(bus.publish("z", "nobody"), 0);` },
      { name: 'handlers are called in subscription order', code: `EventBus bus;
std::string order;
bus.subscribe("t", [&](const std::string&) { order += "A"; });
bus.subscribe("t", [&](const std::string&) { order += "B"; });
bus.subscribe("t", [&](const std::string&) { order += "C"; });
EXPECT_EQ(bus.publish("t", "m"), 3);
EXPECT_EQ(order, std::string("ABC"));` },
      { name: 'unsubscribe stops delivery', code: `EventBus bus;
int calls1 = 0, calls2 = 0;
int id1 = bus.subscribe("t", [&](const std::string&) { ++calls1; });
bus.subscribe("t", [&](const std::string&) { ++calls2; });
bus.publish("t", "m");
bus.unsubscribe(id1);
EXPECT_EQ(bus.publish("t", "m"), 1);
EXPECT_EQ(calls1, 1);
EXPECT_EQ(calls2, 2);
bus.unsubscribe(9999);
EXPECT_EQ(bus.publish("t", "m"), 1);` },
    ],
    hints: [
      'Keep a counter for the next id and a container of subscriptions that remembers the id, the topic and the std::function.',
      'A std::map<int, Subscription> keyed by id keeps handlers sorted by id, which is also subscription order.',
      'publish: loop over the map, call sub.handler(message) when sub.topic == topic, and count the calls.',
    ],
    solution: `#include <functional>
#include <map>
#include <string>
#include <utility>

class EventBus {
    struct Subscription {
        std::string topic;
        std::function<void(const std::string&)> handler;
    };
    std::map<int, Subscription> subs_;
    int next_id_ = 1;
public:
    int subscribe(const std::string& topic, std::function<void(const std::string&)> handler) {
        int id = next_id_++;
        subs_[id] = Subscription{topic, std::move(handler)};
        return id;
    }
    void unsubscribe(int id) { subs_.erase(id); }
    int publish(const std::string& topic, const std::string& message) {
        int delivered = 0;
        for (auto& [id, sub] : subs_) {
            if (sub.topic == topic) {
                sub.handler(message);
                ++delivered;
            }
        }
        return delivered;
    }
};
`,
    explanation: `The bus is the **subject**: it knows only "a callable subscribed to a topic", never who the observers are. \`std::function\` lets any lambda, functor or function become an observer, so publishers and subscribers are decoupled.

Returning an id from \`subscribe\` is the cure for the **lapsed-listener** problem: any subscriber that goes away can call \`unsubscribe(id)\`, so the bus does not keep dead handlers alive. A \`std::map\` keyed by an increasing id gives deterministic delivery in subscription order.`,
  },
  {
    id: 'patterns-2-e02', lang: 'cpp', title: 'Undo and redo (Command)', difficulty: 3,
    task: `Build a tiny text editor with undoable commands.

- \`class TextEditor\`: \`const std::string& text() const\`; \`void insert(std::size_t pos, const std::string& s)\` inserts \`s\` before index \`pos\`; \`std::string erase(std::size_t pos, std::size_t len)\` removes up to \`len\` characters starting at \`pos\` and **returns the removed text**.
- \`class Command\`: abstract, virtual destructor, \`virtual void execute() = 0\` and \`virtual void undo() = 0\`.
- \`InsertCommand(TextEditor& ed, std::size_t pos, std::string text)\` and \`DeleteCommand(TextEditor& ed, std::size_t pos, std::size_t len)\`. \`DeleteCommand\` must remember what it removed so \`undo()\` restores it.
- \`class History\`: \`void run(std::unique_ptr<Command> c)\` executes the command and records it (and **clears the redo stack**); \`bool undo()\` and \`bool redo()\` return \`false\` if there is nothing to undo/redo, otherwise perform it and return \`true\`.

~~~cpp
TextEditor ed; History h;
h.run(std::make_unique<InsertCommand>(ed, 0, "Hello"));
h.run(std::make_unique<InsertCommand>(ed, 5, " world"));   // "Hello world"
h.undo();                                                   // "Hello"
h.redo();                                                   // "Hello world"
~~~`,
    starter: `#include <cstddef>
#include <memory>
#include <string>
#include <vector>

class TextEditor {
    std::string text_;
public:
    const std::string& text() const { return text_; }
    void insert(std::size_t pos, const std::string& s) {}   // TODO
    std::string erase(std::size_t pos, std::size_t len) { return ""; }  // TODO
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class InsertCommand : public Command {
public:
    InsertCommand(TextEditor& ed, std::size_t pos, std::string text) {}  // TODO
    void execute() override {}
    void undo() override {}
};

class DeleteCommand : public Command {
public:
    DeleteCommand(TextEditor& ed, std::size_t pos, std::size_t len) {}  // TODO
    void execute() override {}
    void undo() override {}
};

class History {
public:
    void run(std::unique_ptr<Command> c) {}  // TODO
    bool undo() { return false; }            // TODO
    bool redo() { return false; }            // TODO
};
`,
    tests: [
      { name: 'structure', code: `EXPECT((std::is_abstract_v<Command>));
EXPECT((std::is_base_of_v<Command, InsertCommand>));
EXPECT((std::is_base_of_v<Command, DeleteCommand>));
EXPECT((std::has_virtual_destructor_v<Command>));` },
      { name: 'editor primitives', code: `TextEditor ed;
ed.insert(0, "Hello");
ed.insert(5, " world");
EXPECT_EQ(ed.text(), std::string("Hello world"));
std::string removed = ed.erase(5, 6);
EXPECT_EQ(removed, std::string(" world"));
EXPECT_EQ(ed.text(), std::string("Hello"));` },
      { name: 'run executes commands', code: `TextEditor ed; History h;
h.run(std::make_unique<InsertCommand>(ed, 0, "Hello"));
h.run(std::make_unique<InsertCommand>(ed, 5, " world"));
EXPECT_EQ(ed.text(), std::string("Hello world"));
h.run(std::make_unique<DeleteCommand>(ed, 0, 6));
EXPECT_EQ(ed.text(), std::string("world"));` },
      { name: 'undo restores deleted text', code: `TextEditor ed; History h;
h.run(std::make_unique<InsertCommand>(ed, 0, "Hello world"));
h.run(std::make_unique<DeleteCommand>(ed, 5, 6));
EXPECT_EQ(ed.text(), std::string("Hello"));
EXPECT(h.undo());
EXPECT_EQ(ed.text(), std::string("Hello world"));
EXPECT(h.undo());
EXPECT_EQ(ed.text(), std::string(""));` },
      { name: 'undo and redo return false when empty', code: `TextEditor ed; History h;
EXPECT(!h.undo());
EXPECT(!h.redo());
h.run(std::make_unique<InsertCommand>(ed, 0, "a"));
EXPECT(h.undo());
EXPECT(!h.undo());` },
      { name: 'redo re-applies', code: `TextEditor ed; History h;
h.run(std::make_unique<InsertCommand>(ed, 0, "ab"));
h.run(std::make_unique<InsertCommand>(ed, 2, "cd"));
h.undo();
h.undo();
EXPECT_EQ(ed.text(), std::string(""));
EXPECT(h.redo());
EXPECT_EQ(ed.text(), std::string("ab"));
EXPECT(h.redo());
EXPECT_EQ(ed.text(), std::string("abcd"));
EXPECT(!h.redo());` },
      { name: 'a new command clears redo', code: `TextEditor ed; History h;
h.run(std::make_unique<InsertCommand>(ed, 0, "one"));
h.undo();
h.run(std::make_unique<InsertCommand>(ed, 0, "two"));
EXPECT(!h.redo());
EXPECT_EQ(ed.text(), std::string("two"));` },
    ],
    hints: [
      'InsertCommand::execute calls ed_.insert(pos_, text_); undo calls ed_.erase(pos_, text_.size()). DeleteCommand::execute stores the string returned by ed_.erase(pos_, len_).',
      'History keeps two std::vector<std::unique_ptr<Command>>: undo_ and redo_. run() executes, pushes to undo_, then clears redo_.',
      'undo(): if undo_ is empty return false; move the back element out, call undo() on it, push it onto redo_. redo() mirrors this: execute() it again and push it back onto undo_.',
    ],
    solution: `#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class TextEditor {
    std::string text_;
public:
    const std::string& text() const { return text_; }
    void insert(std::size_t pos, const std::string& s) { text_.insert(pos, s); }
    std::string erase(std::size_t pos, std::size_t len) {
        std::string removed = text_.substr(pos, len);
        text_.erase(pos, len);
        return removed;
    }
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class InsertCommand : public Command {
    TextEditor& ed_;
    std::size_t pos_;
    std::string text_;
public:
    InsertCommand(TextEditor& ed, std::size_t pos, std::string text)
        : ed_(ed), pos_(pos), text_(std::move(text)) {}
    void execute() override { ed_.insert(pos_, text_); }
    void undo() override { ed_.erase(pos_, text_.size()); }
};

class DeleteCommand : public Command {
    TextEditor& ed_;
    std::size_t pos_, len_;
    std::string removed_;
public:
    DeleteCommand(TextEditor& ed, std::size_t pos, std::size_t len)
        : ed_(ed), pos_(pos), len_(len) {}
    void execute() override { removed_ = ed_.erase(pos_, len_); }
    void undo() override { ed_.insert(pos_, removed_); }
};

class History {
    std::vector<std::unique_ptr<Command>> undo_, redo_;
public:
    void run(std::unique_ptr<Command> c) {
        c->execute();
        undo_.push_back(std::move(c));
        redo_.clear();
    }
    bool undo() {
        if (undo_.empty()) return false;
        auto c = std::move(undo_.back());
        undo_.pop_back();
        c->undo();
        redo_.push_back(std::move(c));
        return true;
    }
    bool redo() {
        if (redo_.empty()) return false;
        auto c = std::move(redo_.back());
        redo_.pop_back();
        c->execute();
        undo_.push_back(std::move(c));
        return true;
    }
};
`,
    explanation: `Each edit is an **object** with \`execute()\` and \`undo()\`, which is the Command pattern. A command stores whatever it needs to reverse itself: \`InsertCommand\` knows the position and length, while \`DeleteCommand\` captures the removed text at execution time because it cannot know it beforehand.

\`History\` is the **invoker**. It owns commands in two stacks: running a command pushes onto the undo stack, undo moves one to the redo stack and redo moves it back. A fresh \`run\` clears the redo stack because the alternate future it described no longer applies. \`unique_ptr\` moves express the single ownership of each command.`,
  },
  {
    id: 'patterns-2-e03', lang: 'python', title: 'Traffic light (State)', difficulty: 2,
    task: `Model a traffic light with the **State** pattern.

- Classes \`Green\`, \`Yellow\` and \`Red\`, each with a \`name\` class attribute (\`"green"\`, \`"yellow"\`, \`"red"\`), \`next_state(self)\` returning a **new instance** of the following state (Green to Yellow to Red to Green) and \`on_button(self)\` returning the state after a pedestrian presses the button: \`Green\` returns a \`Yellow\` instance, \`Yellow\` and \`Red\` return \`self\` (the press is ignored).
- \`TrafficLight()\` starts in \`Green\`. It stores the current state object in \`self.state\` and has:
  - \`state_name\` property: the current state's \`name\`;
  - \`next()\`: advance to the next state;
  - \`pedestrian_button()\`: apply the current state's \`on_button\`.

~~~python
light = TrafficLight()
light.state_name          # 'green'
light.pedestrian_button()
light.state_name          # 'yellow'
light.next(); light.next()
light.state_name          # 'green'
~~~`,
    starter: `class Green:
    name = "green"

    def next_state(self):
        raise NotImplementedError

    def on_button(self):
        raise NotImplementedError


class Yellow:
    name = "yellow"

    def next_state(self):
        raise NotImplementedError

    def on_button(self):
        raise NotImplementedError


class Red:
    name = "red"

    def next_state(self):
        raise NotImplementedError

    def on_button(self):
        raise NotImplementedError


class TrafficLight:
    def __init__(self):
        raise NotImplementedError

    @property
    def state_name(self):
        raise NotImplementedError

    def next(self):
        raise NotImplementedError

    def pedestrian_button(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'starts green with a state object', code: `light = TrafficLight()
assert light.state_name == "green"
assert isinstance(light.state, Green), "self.state should hold the current state object"` },
      { name: 'cycle green yellow red green', code: `light = TrafficLight()
seen = [light.state_name]
for _ in range(3):
    light.next()
    seen.append(light.state_name)
assert seen == ["green", "yellow", "red", "green"], seen` },
      { name: 'button in green goes yellow immediately', code: `light = TrafficLight()
light.pedestrian_button()
assert light.state_name == "yellow"
assert isinstance(light.state, Yellow)` },
      { name: 'button ignored in yellow and red', code: `light = TrafficLight()
light.next()
assert light.state_name == "yellow"
light.pedestrian_button()
assert light.state_name == "yellow"
light.next()
assert light.state_name == "red"
light.pedestrian_button()
assert light.state_name == "red"` },
      { name: 'states choose their successor', code: `assert isinstance(Green().next_state(), Yellow)
assert isinstance(Yellow().next_state(), Red)
assert isinstance(Red().next_state(), Green)
r = Red()
assert r.on_button() is r
y = Yellow()
assert y.on_button() is y
assert isinstance(Green().on_button(), Yellow)` },
    ],
    hints: [
      'Each state class implements the transitions itself: Green.next_state returns Yellow(), and so on. The light never contains an if/elif chain on names.',
      'TrafficLight stores self.state = Green(). next() does self.state = self.state.next_state(); pedestrian_button() does self.state = self.state.on_button().',
      'state_name is a @property that returns self.state.name. Green.on_button returns Yellow(); Yellow and Red return self.',
    ],
    solution: `class Green:
    name = "green"

    def next_state(self):
        return Yellow()

    def on_button(self):
        return Yellow()


class Yellow:
    name = "yellow"

    def next_state(self):
        return Red()

    def on_button(self):
        return self


class Red:
    name = "red"

    def next_state(self):
        return Green()

    def on_button(self):
        return self


class TrafficLight:
    def __init__(self):
        self.state = Green()

    @property
    def state_name(self):
        return self.state.name

    def next(self):
        self.state = self.state.next_state()

    def pedestrian_button(self):
        self.state = self.state.on_button()
`,
    explanation: `The light has **no conditionals** on its mode. Each state object knows its own behaviour (what the button does) and its own successor, and \`TrafficLight\` simply delegates to \`self.state\` and replaces it with whatever comes back. That is the State pattern: behaviour varies with an internal object that changes over time.

Adding a flashing-red state is a new class and one edited transition, not a hunt through every method for \`if state == ...\`. Notice how \`Yellow\` and \`Red\` ignore the button by returning \`self\`, so rules that apply to only one state live in only that class.`,
  },
  {
    id: 'patterns-2-e04', lang: 'python', title: 'Countdown and Paginator (Iterator)', difficulty: 2,
    task: `Implement two iteration styles.

- \`Countdown(n)\` is **re-iterable**: \`__iter__\` is a generator that yields \`n, n-1, ..., 1\` (nothing for \`n <= 0\`). It must not define \`__next__\`.
- \`Paginator(items, page_size)\` is a **one-shot iterator**: \`__iter__\` returns \`self\` and \`__next__\` returns the next page as a list of up to \`page_size\` items, raising \`StopIteration\` when there are no more. \`page_size < 1\` raises \`ValueError\`. Copy \`items\` on construction.

~~~python
list(Countdown(3))                    # [3, 2, 1]
p = Paginator([1, 2, 3, 4, 5], 2)
list(p)                               # [[1, 2], [3, 4], [5]]
list(p)                               # []  (exhausted)
~~~`,
    starter: `class Countdown:
    def __init__(self, n):
        raise NotImplementedError

    def __iter__(self):
        raise NotImplementedError


class Paginator:
    def __init__(self, items, page_size):
        raise NotImplementedError

    def __iter__(self):
        raise NotImplementedError

    def __next__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'countdown values', code: `assert list(Countdown(3)) == [3, 2, 1]
assert list(Countdown(0)) == []
assert list(Countdown(-2)) == []` },
      { name: 'countdown is re-iterable', code: `c = Countdown(3)
assert list(c) == [3, 2, 1]
assert list(c) == [3, 2, 1], "a second pass should work"
assert iter(c) is not c
assert not hasattr(Countdown, "__next__"), "Countdown is an iterable, not an iterator"` },
      { name: 'paginator pages', code: `p = Paginator([1, 2, 3, 4, 5], 2)
assert list(p) == [[1, 2], [3, 4], [5]]
assert list(Paginator([], 3)) == []
assert list(Paginator([1, 2, 3], 3)) == [[1, 2, 3]]` },
      { name: 'paginator is one-shot and its own iterator', code: `p = Paginator([1, 2, 3], 2)
assert iter(p) is p
assert next(p) == [1, 2]
assert next(p) == [3]
try:
    next(p)
except StopIteration:
    pass
else:
    raise AssertionError("expected StopIteration")
assert list(p) == [], "an exhausted paginator stays exhausted"` },
      { name: 'paginator validation and copy', code: `try:
    Paginator([1], 0)
except ValueError:
    pass
else:
    raise AssertionError("page_size 0 must raise ValueError")
src = [1, 2, 3]
p = Paginator(src, 2)
src.append(4)
assert list(p) == [[1, 2], [3]], "items should be copied on construction"` },
    ],
    hints: [
      'Countdown.__iter__ can be a generator: for i in range(self.n, 0, -1): yield i. Each call creates a fresh generator, so it is re-iterable.',
      'Paginator is its own iterator: __iter__ returns self, and it stores a position index that __next__ advances.',
      '__next__: if self._pos >= len(self._items): raise StopIteration; page = self._items[self._pos:self._pos + self._size]; self._pos += self._size; return page.',
    ],
    solution: `class Countdown:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        for i in range(self.n, 0, -1):
            yield i


class Paginator:
    def __init__(self, items, page_size):
        if page_size < 1:
            raise ValueError("page_size must be at least 1")
        self._items = list(items)
        self._size = page_size
        self._pos = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self._pos >= len(self._items):
            raise StopIteration
        page = self._items[self._pos:self._pos + self._size]
        self._pos += self._size
        return page
`,
    explanation: `Python separates two roles. An **iterable** (\`Countdown\`) has \`__iter__\` that hands out a *fresh* iterator each time, so it can be looped over again and again; writing \`__iter__\` as a generator gives you that for free. An **iterator** (\`Paginator\`) carries its own position, so \`__iter__\` returns \`self\` and \`__next__\` advances, which makes it single-use.

Both hide how the data is stored from the \`for\` loop, the heart of the Iterator pattern. Copying \`items\` up front protects the paginator from later changes to the caller's list.`,
  },
];
