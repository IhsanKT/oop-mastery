export default [
  {
    id: 'composition-e01', lang: 'cpp', title: 'Car composes, Garage aggregates', difficulty: 2,
    task: `Model one composition and one aggregation.

- \`class Engine\`: \`explicit Engine(int hp)\`; \`std::string start() const\` returns \`"Engine started: <hp>hp"\` (e.g. \`"Engine started: 150hp"\`); its destructor increments a counter \`inline static int destroyed = 0;\`.
- \`struct Wheel {};\`
- \`class Car\`: \`explicit Car(int hp)\` composes an \`Engine\` **by value** and four \`Wheel\`s (e.g. \`std::array<Wheel, 4>\`). \`std::string start()\` forwards to the engine; \`int wheelCount() const\` returns 4. \`Car\` must **not** inherit from \`Engine\`.
- \`class Garage\` aggregates cars without owning them: \`void park(Car& c)\`, \`std::size_t count() const\`, \`Car& at(std::size_t i)\` returning the parked car itself. Destroying a \`Garage\` must not destroy any \`Car\`.

~~~cpp
Car c(150);
Garage g;
g.park(c);
g.count();      // 1
c.start();      // "Engine started: 150hp"
~~~`,
    starter: `#include <array>
#include <cstddef>
#include <string>
#include <vector>

class Engine {
    int hp_;
public:
    inline static int destroyed = 0;
    explicit Engine(int hp) : hp_(hp) {}
    ~Engine() { ++destroyed; }
    std::string start() const { return ""; }
};

struct Wheel {};

class Car {
    Engine engine_;
public:
    explicit Car(int hp) : engine_(hp) {}
    std::string start() { return ""; }
    int wheelCount() const { return 0; }
};

class Garage {
    Car* dummy_ = nullptr;
public:
    void park(Car& c) { (void)c; }
    std::size_t count() const { return 0; }
    Car& at(std::size_t i) { (void)i; return *dummy_; }
};
`,
    tests: [
      { name: 'composition, not inheritance', code: `EXPECT((!std::is_base_of_v<Engine, Car>));
EXPECT((!std::is_base_of_v<Car, Engine>));` },
      { name: 'car starts and has four wheels', code: `Car c(150);
EXPECT_EQ(c.start(), std::string("Engine started: 150hp"));
Car d(90);
EXPECT_EQ(d.start(), std::string("Engine started: 90hp"));
EXPECT_EQ(c.wheelCount(), 4);` },
      { name: 'engine dies with its car', code: `int before = Engine::destroyed;
{
    Car c(100);
    EXPECT_EQ(Engine::destroyed, before);
}
EXPECT_EQ(Engine::destroyed, before + 1);` },
      { name: 'garage does not own cars', code: `Car a(100), b(200);
int before = Engine::destroyed;
{
    Garage g;
    g.park(a); g.park(b);
    EXPECT_EQ(g.count(), std::size_t(2));
    EXPECT(&g.at(0) == &a);
    EXPECT(&g.at(1) == &b);
}
EXPECT_EQ(Engine::destroyed, before);
EXPECT_EQ(a.start(), std::string("Engine started: 100hp"));` },
    ],
    hints: [
      'Engine::start can build its string with "Engine started: " + std::to_string(hp_) + "hp". Car keeps an Engine member by value and a std::array<Wheel, 4>.',
      'Garage holds std::vector<Car*> cars_; park pushes &c, count returns cars_.size(), at returns *cars_.at(i). Because Garage stores only pointers, its destructor never touches the cars.',
    ],
    solution: `#include <array>
#include <cstddef>
#include <string>
#include <vector>

class Engine {
    int hp_;
public:
    inline static int destroyed = 0;
    explicit Engine(int hp) : hp_(hp) {}
    ~Engine() { ++destroyed; }
    std::string start() const { return "Engine started: " + std::to_string(hp_) + "hp"; }
};

struct Wheel {};

class Car {
    Engine engine_;
    std::array<Wheel, 4> wheels_;
public:
    explicit Car(int hp) : engine_(hp) {}
    std::string start() { return engine_.start(); }
    int wheelCount() const { return static_cast<int>(wheels_.size()); }
};

class Garage {
    std::vector<Car*> cars_;
public:
    void park(Car& c) { cars_.push_back(&c); }
    std::size_t count() const { return cars_.size(); }
    Car& at(std::size_t i) { return *cars_.at(i); }
};
`,
    explanation: `**Composition = ownership.** \`Car\` holds its \`Engine\` and \`Wheel\`s by value, so they are constructed with the car and destroyed with it (the \`destroyed\` counter proves it). \`Car\` *has* an engine and forwards \`start()\` to it; it does not inherit from \`Engine\`, because a car is not a kind of engine.

**Aggregation = no ownership.** \`Garage\` stores non-owning pointers, so cars have their own lifetime and the garage's destructor leaves them alone. The price is that the cars must outlive the garage, or the pointers dangle. In UML: filled diamond Car-Engine, hollow diamond Garage-Car.`,
  },
  {
    id: 'composition-e02', lang: 'cpp', title: 'Window features instead of a class explosion', difficulty: 2,
    task: `Replace a pile of window subclasses with composition.

- \`struct Feature\`: virtual destructor and pure virtual \`std::string name() const\`.
- \`Border\` (name \`"border"\`), \`Scrollbar\` (name \`"scrollbar"\`) and \`Title\` (constructor \`explicit Title(std::string text)\`, name \`"title:" + text\`), all deriving from \`Feature\`.
- \`class Window\`: \`void add(std::unique_ptr<Feature> f)\` and \`std::string render() const\`. \`render()\` returns \`"Window[" + names joined by ", " + "]"\` in the order added; an empty window renders \`"Window[]"\`.

~~~cpp
Window w;
w.add(std::make_unique<Border>());
w.add(std::make_unique<Title>("Hi"));
w.render();    // "Window[border, title:Hi]"
~~~`,
    starter: `#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Feature {
    virtual ~Feature() = default;
    virtual std::string name() const = 0;
};

struct Border : Feature {
    std::string name() const override { return ""; }
};

struct Scrollbar : Feature {
    std::string name() const override { return ""; }
};

class Title : public Feature {
    std::string text_;
public:
    explicit Title(std::string text) : text_(std::move(text)) {}
    std::string name() const override { return ""; }
};

class Window {
    std::vector<std::unique_ptr<Feature>> features_;
public:
    void add(std::unique_ptr<Feature> f) { features_.push_back(std::move(f)); }
    std::string render() const { return ""; }
};
`,
    tests: [
      { name: 'Feature is an abstract interface', code: `EXPECT(std::is_abstract_v<Feature>);
EXPECT((std::is_base_of_v<Feature, Border>));
EXPECT((std::is_base_of_v<Feature, Scrollbar>));
EXPECT((std::is_base_of_v<Feature, Title>));
EXPECT(!(std::is_base_of_v<Border, Window>));` },
      { name: 'feature names', code: `EXPECT_EQ(Border().name(), std::string("border"));
EXPECT_EQ(Scrollbar().name(), std::string("scrollbar"));
EXPECT_EQ(Title("Hi").name(), std::string("title:Hi"));` },
      { name: 'render in order', code: `Window w;
w.add(std::make_unique<Border>());
w.add(std::make_unique<Scrollbar>());
w.add(std::make_unique<Title>("Hi"));
EXPECT_EQ(w.render(), std::string("Window[border, scrollbar, title:Hi]"));` },
      { name: 'empty and single', code: `Window e;
EXPECT_EQ(e.render(), std::string("Window[]"));
Window s;
s.add(std::make_unique<Scrollbar>());
EXPECT_EQ(s.render(), std::string("Window[scrollbar]"));` },
    ],
    hints: [
      'Each Feature subclass is one line: return "border"; return "scrollbar"; return "title:" + text_;',
      'In render(), build the string with a loop: start with "Window[", add ", " before every feature except the first, append features_[i]->name(), and finish with "]".',
    ],
    solution: `#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Feature {
    virtual ~Feature() = default;
    virtual std::string name() const = 0;
};

struct Border : Feature {
    std::string name() const override { return "border"; }
};

struct Scrollbar : Feature {
    std::string name() const override { return "scrollbar"; }
};

class Title : public Feature {
    std::string text_;
public:
    explicit Title(std::string text) : text_(std::move(text)) {}
    std::string name() const override { return "title:" + text_; }
};

class Window {
    std::vector<std::unique_ptr<Feature>> features_;
public:
    void add(std::unique_ptr<Feature> f) { features_.push_back(std::move(f)); }
    std::string render() const {
        std::string out = "Window[";
        for (std::size_t i = 0; i < features_.size(); ++i) {
            if (i) out += ", ";
            out += features_[i]->name();
        }
        return out + "]";
    }
};
`,
    explanation: `**Features multiply by composition, not inheritance.** With subclasses you would need \`BorderedWindow\`, \`ScrollableWindow\`, \`BorderedScrollableWindow\` and so on, up to 2^N classes. Here there is one \`Window\` and N small \`Feature\` classes; any combination is just a different list at run time.

**Ownership in the type.** \`std::vector<std::unique_ptr<Feature>>\` means the window *owns* its features (composition) and destroys them through the virtual destructor. Callers pass ownership with \`std::move\` or \`make_unique\`. This is also the Strategy/Decorator-style flexibility that Python gets by holding a list of objects.`,
  },
  {
    id: 'composition-e03', lang: 'python', title: 'A Stack that has a list', difficulty: 1,
    task: `Write a \`Stack\` that **composes** a list instead of inheriting from it.

- \`push(item)\`
- \`pop()\` removes and returns the top item; raises \`IndexError\` if empty.
- \`peek()\` returns the top item without removing it; raises \`IndexError\` if empty.
- \`__len__\` returns the number of items; \`is_empty()\` returns a bool.
- It must not be a \`list\` and must not expose \`insert\`.

~~~python
s = Stack()
s.push(1); s.push(2)
s.peek()        # 2
len(s)          # 2
hasattr(s, "insert")   # False
~~~`,
    starter: `class Stack:
    def __init__(self):
        raise NotImplementedError

    def push(self, item):
        raise NotImplementedError

    def pop(self):
        raise NotImplementedError

    def peek(self):
        raise NotImplementedError

    def __len__(self):
        raise NotImplementedError

    def is_empty(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'push, peek, pop', code: `s = Stack()
s.push(1); s.push(2); s.push(3)
assert s.peek() == 3
assert s.pop() == 3
assert s.pop() == 2
assert len(s) == 1` },
      { name: 'is_empty and len', code: `s = Stack()
assert s.is_empty() is True and len(s) == 0
s.push("a")
assert s.is_empty() is False and len(s) == 1` },
      { name: 'empty raises IndexError', code: `s = Stack()
for op in (s.pop, s.peek):
    try:
        op()
        assert False, "should raise IndexError"
    except IndexError:
        pass` },
      { name: 'composition, not inheritance', code: `s = Stack()
assert not isinstance(s, list), "Stack must not inherit from list"
assert not hasattr(s, "insert"), "do not expose list methods"
assert not hasattr(s, "append")` },
    ],
    hints: [
      'Create self._items = [] in __init__ and implement each method by delegating to it.',
      'pop: if not self._items: raise IndexError("pop from empty stack"), then return self._items.pop(). peek returns self._items[-1] after the same check. is_empty returns not self._items.',
    ],
    solution: `class Stack:
    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self):
        if not self._items:
            raise IndexError("peek at empty stack")
        return self._items[-1]

    def __len__(self):
        return len(self._items)

    def is_empty(self):
        return not self._items
`,
    explanation: `**Has-a, not is-a.** The stack *has* a list and uses it as private storage; it does not *be* a list. So clients get exactly the stack operations: no \`insert\`, \`sort\` or \`__setitem__\` that could violate last-in-first-out order. If you later swap the list for a \`deque\` or a linked list, no caller changes.

**The cost: delegation.** Each exposed operation is a forwarding method. Python's \`__getattr__\` cannot replace them for special methods such as \`__len__\`, which is why it is written explicitly. The C++ equivalent is a class with a private \`std::vector\` member.`,
  },
  {
    id: 'composition-e04', lang: 'python', title: 'LSP-safe shapes', difficulty: 3,
    task: `Avoid the Square/Rectangle trap with immutable value objects.

- \`Rectangle(w, h)\` is immutable (assigning to \`w\` or \`h\` raises \`AttributeError\`). Methods: \`area()\`, \`with_width(w)\` returns a **new** \`Rectangle\` with that width, and \`scaled(factor)\` returns a new \`Rectangle\` with both sides multiplied.
- \`Square(side)\` is immutable too, with attribute \`side\`, \`area()\`, and \`scaled(factor)\` returning a new \`Square\`.
- \`Square\` is **not** a subclass of \`Rectangle\` (nor the reverse).
- \`resize_all(shapes, factor)\` returns a list of scaled copies and works for any mix of both.

~~~python
Rectangle(2, 3).with_width(5).area()      # 15
resize_all([Rectangle(1, 2), Square(3)], 2)   # [Rectangle(w=2, h=4), Square(side=6)]
~~~`,
    starter: `class Rectangle:
    def __init__(self, w, h):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError

    def with_width(self, w):
        raise NotImplementedError

    def scaled(self, factor):
        raise NotImplementedError


class Square:
    def __init__(self, side):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError

    def scaled(self, factor):
        raise NotImplementedError


def resize_all(shapes, factor):
    raise NotImplementedError
`,
    tests: [
      { name: 'not subclasses of each other', code: `assert not issubclass(Square, Rectangle), "Square must not inherit from Rectangle"
assert not issubclass(Rectangle, Square)` },
      { name: 'rectangle behaviour', code: `r = Rectangle(2, 3)
assert r.area() == 6
r2 = r.with_width(5)
assert r2.area() == 15 and r2 is not r
assert r.area() == 6, "with_width must not mutate the original"
s = r.scaled(2)
assert (s.w, s.h) == (4, 6) and isinstance(s, Rectangle)` },
      { name: 'square behaviour and immutability', code: `q = Square(3)
assert q.area() == 9 and q.side == 3
q2 = q.scaled(2)
assert isinstance(q2, Square) and q2.side == 6
for obj, attr in ((q, "side"), (Rectangle(1, 1), "w")):
    try:
        setattr(obj, attr, 99)
        assert False, "should be immutable"
    except AttributeError:
        pass` },
      { name: 'resize_all works for any shape', code: `out = resize_all([Rectangle(1, 2), Square(3)], 2)
assert [s.area() for s in out] == [8, 36]
assert isinstance(out[0], Rectangle) and isinstance(out[1], Square)
assert resize_all([], 3) == []` },
    ],
    hints: [
      'A frozen dataclass gives immutability, a readable repr and equality for free: @dataclass(frozen=True) with fields w, h (and side).',
      'with_width returns Rectangle(w, self.h); scaled returns type-preserving copies (Rectangle(self.w * f, self.h * f), Square(self.side * f)). resize_all is a list comprehension calling s.scaled(factor).',
    ],
    solution: `from dataclasses import dataclass


@dataclass(frozen=True)
class Rectangle:
    w: float
    h: float

    def area(self):
        return self.w * self.h

    def with_width(self, w):
        return Rectangle(w, self.h)

    def scaled(self, factor):
        return Rectangle(self.w * factor, self.h * factor)


@dataclass(frozen=True)
class Square:
    side: float

    def area(self):
        return self.side * self.side

    def scaled(self, factor):
        return Square(self.side * factor)


def resize_all(shapes, factor):
    return [s.scaled(factor) for s in shapes]
`,
    explanation: `**Respect the contract.** The mutable \`Square(Rectangle)\` fails the Liskov Substitution Principle because \`set_width\` on a square must change the height too, breaking what \`Rectangle\` promises. Removing mutation removes the broken promise: \`with_width\` returns a new object, so there is no hidden side effect for a square to violate.

**Share behavior, not inheritance.** Both classes simply offer \`area()\` and \`scaled()\`, so \`resize_all\` works on either through duck typing; no \`is-a\` link is needed. A \`Square\` is *not* a \`Rectangle\` here because its set of valid operations is different. In C++ the same design uses a common abstract interface (or none at all) with immutable value types.`,
  },
];
