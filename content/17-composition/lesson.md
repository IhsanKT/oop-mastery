## Why composition?

Inheritance is the first tool people reach for, and the one they most often regret. Say you need a window that can have a border, a scrollbar and a colored background. With inheritance you write `BorderedWindow`, `ScrollableWindow`, `ColoredBorderedScrollableWindow`, and every new feature doubles the number of classes. Composition answers a different question: instead of "what *is* this?", ask "what does it *have*, and who does the work?" This module covers how classes relate, how to read those relations in UML, and why "favor composition over inheritance" is good advice.

## Kinds of relationships

- **Dependency** ("uses"): a method takes or briefly uses another type. Dashed arrow.
- **Association**: one object holds a reference to another and they interact; neither owns the other.
- **Aggregation** ("has-a", weak): the whole holds parts that can exist without it. Hollow diamond.
- **Composition** ("has-a", strong): the parts live and die with the whole. Filled diamond.
- **Generalization** ("is-a"): inheritance. Hollow triangle pointing at the base.

~~~text
+---------------+ <>------ 1..* +----------+         +--------+
|     Car       |  filled        |  Wheel   |         |  Shape |
+---------------+  diamond       +----------+         +--------+
| - engine      |                                        ^  hollow triangle
| + start()     | <>-------- 0..* [ Driver ]            |  (generalization)
+---------------+  hollow diamond                  +--------+
        - - - - - - - -> Logger  (dependency, dashed)     |  Circle |
~~~

Visibility marks: `+` public, `-` private, `#` protected. Multiplicity such as `1`, `0..1`, `1..*` says how many objects sit at each end.

## Composition over inheritance

Reuse by inheritance couples you to the whole base interface. A `Stack` that inherits from `list` is also an `insert`-anywhere list, which breaks the idea of a stack. Composition hides the part behind exactly the interface you choose.

~~~cpp
#include <stdexcept>
#include <vector>

class Stack {                       // has-a vector; is NOT a vector
    std::vector<int> items_;        // private, owned by value
public:
    void push(int v) { items_.push_back(v); }
    int pop() {
        if (items_.empty()) throw std::out_of_range("empty");
        int v = items_.back();
        items_.pop_back();
        return v;
    }
    std::size_t size() const { return items_.size(); }
};
~~~
~~~python
class Stack:
    def __init__(self):
        self._items = []            # has-a list; is NOT a list

    def push(self, v):
        self._items.append(v)

    def pop(self):
        if not self._items:
            raise IndexError("empty")
        return self._items.pop()

    def __len__(self):
        return len(self._items)

s = Stack()
hasattr(s, "insert")    # False: the list's extra methods are not exposed
~~~

The cost of composition is **delegation boilerplate**: you must forward each method you want to expose.

~~~cpp
class Car {
    Engine engine_;                           // composed by value
public:
    std::string start() { return engine_.start(); }    // forwarding
};
~~~
~~~python
class Car:
    def __init__(self, engine):
        self._engine = engine

    def start(self):
        return self._engine.start()            # forwarding

class Proxy:
    def __init__(self, target):
        self._target = target
    def __getattr__(self, name):               # forwards unknown attributes
        return getattr(self._target, name)

# len(Proxy([1, 2])) -> TypeError: special methods are looked up on the type,
# so __getattr__ is bypassed. Define __len__ explicitly.
~~~

> **Pitfall:** `__getattr__` delegation does not cover special methods like `__len__`, `__iter__` or `__getitem__`; operators and built-ins look them up on the class, not the instance.

## Ownership

In C++ the type says who owns what: a member **by value** or a `std::unique_ptr` member is owned (composition); a reference or raw pointer is *non-owning* (aggregation/association) and the owner must outlive it. Members are constructed before the constructor body and destroyed after the destructor body, in reverse order.

~~~cpp
struct Engine { ~Engine() { std::cout << "~Engine "; } };
struct Car {
    Engine engine;                                  // composed: dies with Car
    ~Car() { std::cout << "~Car "; }                // prints "~Car ~Engine "
};

class Garage {
    std::vector<Car*> cars_;                        // aggregated: not owned
public:
    void park(Car& c) { cars_.push_back(&c); }      // Garage never deletes them
};
~~~
~~~python
class Car:
    def __init__(self):
        self.engine = Engine()      # by convention Car owns its engine

class Garage:
    def __init__(self):
        self.cars = []              # references only: cars outlive the garage
~~~

> **C++ vs Python:** Python has no ownership syntax: everything is a reference and garbage collection frees objects when nothing refers to them. Composition vs aggregation is a documented convention.

## Liskov Substitution Principle

If `S` is a subtype of `T`, code written for `T` must still work with an `S`. Subtyping is about **behavior and contracts**, not just matching signatures. The classic breakage: `Square` inherits `Rectangle`.

~~~cpp
class Rectangle {
protected:
    int w_, h_;
public:
    Rectangle(int w, int h) : w_(w), h_(h) {}
    virtual void setWidth(int w) { w_ = w; }
    int area() const { return w_ * h_; }
};
class Square : public Rectangle {
public:
    explicit Square(int s) : Rectangle(s, s) {}
    void setWidth(int w) override { w_ = h_ = w; }   // surprise: height changes too
};
// void stretch(Rectangle& r) { r.setWidth(10); }  // caller assumes height unchanged
~~~
~~~python
class Rectangle:
    def __init__(self, w, h):
        self.w, self.h = w, h
    def set_width(self, w):
        self.w = w
    def area(self):
        return self.w * self.h

class Square(Rectangle):
    def __init__(self, s):
        super().__init__(s, s)
    def set_width(self, w):
        self.w = self.h = w      # violates the Rectangle contract

# Fix: make shapes immutable value objects, and do not make Square a Rectangle.
~~~

A subclass may weaken preconditions and strengthen postconditions, never the reverse. When the contract differs, do not inherit.

## Swapping behavior with a composed strategy

Composition lets an object change *how* it does something at run time, which inheritance (fixed at compile time) cannot.

~~~cpp
struct Discount { virtual ~Discount() = default; virtual double apply(double p) const = 0; };
struct NoDiscount : Discount { double apply(double p) const override { return p; } };
struct TenOff : Discount { double apply(double p) const override { return p * 0.9; } };

class Cart {
    std::unique_ptr<Discount> d_ = std::make_unique<NoDiscount>();
public:
    void setDiscount(std::unique_ptr<Discount> d) { d_ = std::move(d); }
    double price(double p) const { return d_->apply(p); }
};
~~~
~~~python
class Cart:
    def __init__(self, discount=lambda p: p):
        self.discount = discount            # a composed strategy

    def price(self, p):
        return self.discount(p)

cart = Cart()
cart.discount = lambda p: p * 0.9           # swapped at run time
~~~

## Defusing a class explosion

Replace `ColoredBorderedScrollableWindow` with one `Window` holding a list of `Feature` objects: three small classes instead of 2^3 combinations, and any mix works.

~~~cpp
struct Feature { virtual ~Feature() = default; virtual std::string name() const = 0; };
class Window {
    std::vector<std::unique_ptr<Feature>> features_;
public:
    void add(std::unique_ptr<Feature> f) { features_.push_back(std::move(f)); }
};
~~~
~~~python
class Window:
    def __init__(self):
        self.features = []
    def add(self, feature):
        self.features.append(feature)
~~~

## Key takeaways

- Relationships range from dependency to association, aggregation, composition and generalization.
- In UML, filled diamond = composition, hollow diamond = aggregation, hollow triangle = inheritance, dashed arrow = dependency.
- Prefer has-a when you want to reuse behavior without inheriting the whole interface.
- Delegation costs boilerplate; Python's `__getattr__` forwarding does not cover special methods.
- In C++, members by value or `unique_ptr` own; references and raw pointers do not.
- A composed member is destroyed after the owner's destructor body.
- Liskov: subtypes must honor the base class's contract, not just its signatures.
- A composed strategy can be swapped at run time; composed features avoid a class explosion.

## Common pitfalls

- Inheriting just to reuse code, exposing methods that break your invariants.
- Storing a non-owning reference to something that gets destroyed first (dangling).
- Assuming `__getattr__` makes `len(proxy)` or `proxy[0]` work.
- Making `Square` a subclass of a mutable `Rectangle`.
- Creating one subclass per combination of features.
