export default [
  {
    id: 'classes-e01', lang: 'cpp', title: 'Vector2', difficulty: 1,
    task: `Write a small 2-D vector type.

- \`struct Vector2\` with two **public** data members \`double x\` and \`double y\`, both defaulting to \`0\`, so that \`Vector2 v{3, 4};\` works. (No constructor is needed: a struct with public members can be initialized with braces.)
- \`double length() const\` returns the Euclidean length, √(x² + y²).
- \`Vector2 add(const Vector2& other) const\` returns a **new** vector holding the component-wise sum. Neither operand changes.
- \`Vector2& scale(double factor)\` multiplies both components by \`factor\` **in place** and returns a reference to the same object (\`*this\`), so that calls can be chained.

~~~cpp
Vector2 v{3, 4};
v.length();                  // 5
Vector2 w = v.add({1, 1});   // w is {4, 5}; v is still {3, 4}
v.scale(2).scale(0.5);       // both calls act on v itself: v is {3, 4} again
~~~`,
    starter: `#include <cmath>

struct Vector2 {
    double x = 0;
    double y = 0;

    double length() const {
        return 0;  // TODO: sqrt(x*x + y*y)
    }

    Vector2 add(const Vector2& other) const {
        return Vector2{};  // TODO: a new vector with the component-wise sum
    }

    // TODO: scale x and y in place. The return type is wrong too:
    // the task asks for a reference to *this, so that calls can chain.
    Vector2 scale(double factor) {
        return *this;
    }
};
`,
    tests: [
      { name: 'x and y are public double members', code: `Vector2 v{3, 4};
EXPECT_NEAR(v.x, 3, 1e-9);
EXPECT_NEAR(v.y, 4, 1e-9);
EXPECT((std::is_same_v<decltype(Vector2::x), double>));
EXPECT((std::is_same_v<decltype(Vector2::y), double>));` },
      { name: 'length', code: `Vector2 a{3, 4};
Vector2 b{-1, 1};
Vector2 zero{0, 0};
EXPECT_NEAR(a.length(), 5.0, 1e-9);
EXPECT_NEAR(b.length(), std::sqrt(2.0), 1e-9);
EXPECT_NEAR(zero.length(), 0.0, 1e-9);` },
      { name: 'length() and add() are const', code: `auto lengthIsConst = [](const auto& v) { return requires { v.length(); }; };
auto addIsConst = [](const auto& v) { return requires { v.add(v); }; };
const Vector2 c{6, 8};
EXPECT(lengthIsConst(c));
EXPECT(addIsConst(c));` },
      { name: 'add returns a new vector', code: `Vector2 a{1, 2};
Vector2 b{3, -5};
Vector2 sum = a.add(b);
EXPECT_NEAR(sum.x, 4, 1e-9);
EXPECT_NEAR(sum.y, -3, 1e-9);
EXPECT_NEAR(a.x, 1, 1e-9);
EXPECT_NEAR(a.y, 2, 1e-9);
EXPECT_NEAR(b.x, 3, 1e-9);
EXPECT_NEAR(b.y, -5, 1e-9);
EXPECT((std::is_same_v<decltype(a.add(b)), Vector2>));` },
      { name: 'scale works in place and returns Vector2&', code: `Vector2 v{1.5, -2};
v.scale(2);
EXPECT_NEAR(v.x, 3, 1e-9);
EXPECT_NEAR(v.y, -4, 1e-9);
EXPECT((std::is_same_v<decltype(v.scale(2.0)), Vector2&>));` },
      { name: 'scale calls can be chained', code: `Vector2 v{1, 2};
v.scale(2).scale(3);
EXPECT_NEAR(v.x, 6, 1e-9);
EXPECT_NEAR(v.y, 12, 1e-9);
Vector2 w{3, 4};
EXPECT_NEAR(w.scale(2).scale(0.5).length(), 5.0, 1e-9);
EXPECT_NEAR(w.x, 3, 1e-9);` },
    ],
    hints: [
      'Inside a member function, `x` and `y` mean `this->x` and `this->y`, the members of the object the function was called on. `length()` is just `std::sqrt(x * x + y * y)`.',
      '`add` must not change either vector: build and return a new one, `return Vector2{x + other.x, y + other.y};`. Marking it `const` lets the compiler check that you did not modify `*this`.',
      'For chaining, change the return type to `Vector2&`, multiply in place (`x *= factor; y *= factor;`) and finish with `return *this;`. With a by-value return type, the second call in `v.scale(2).scale(3)` would act on a temporary copy.',
    ],
    solution: `#include <cmath>

struct Vector2 {
    double x = 0;
    double y = 0;

    double length() const { return std::sqrt(x * x + y * y); }

    Vector2 add(const Vector2& other) const {
        return Vector2{x + other.x, y + other.y};
    }

    Vector2& scale(double factor) {
        x *= factor;
        y *= factor;
        return *this;
    }
};
`,
    explanation: `**State plus behavior in one type.** \`Vector2\` bundles its data (\`x\`, \`y\`) with the operations on it. Inside each member function, \`x\` and \`y\` refer to the members of the object the function was called on (\`this->x\`), so \`a.length()\` and \`b.length()\` run the same code on different data.

**\`const\` tells callers what is safe.** \`length()\` and \`add()\` only read the object, so they are \`const\`: inside them \`this\` is a \`const Vector2*\`, and they can be called on \`const\` vectors and through \`const Vector2&\` parameters. \`add\` takes \`other\` by const reference too, which avoids a copy and promises not to change it. It returns a *new* vector by value, the natural choice for a computed result.

**Chaining needs a reference.** \`scale\` mutates the object and returns \`*this\` as \`Vector2&\`, so \`v.scale(2).scale(3)\` performs both calls on \`v\`. Had it returned \`Vector2\` by value, as in the starter, the second call would scale a temporary copy and \`v\` would only be doubled. (\`std::hypot(x, y)\` from \`<cmath>\` is a numerically robust alternative for \`length()\`.)`,
  },
  {
    id: 'classes-e02', lang: 'cpp', title: 'Playlist', difficulty: 2,
    task: `Build a \`Playlist\` class that owns a list of song names.

- \`class Playlist\` keeps its songs in a **private** \`std::vector<std::string>\`, in the order they were added. A default-constructed playlist is empty.
- \`void addSong(std::string name)\` appends a song. Duplicates are allowed: adding the same name twice stores it twice.
- \`std::size_t size() const\` returns the number of songs.
- \`bool contains(const std::string& name) const\` returns whether a song with exactly that name (case-sensitive, whole name) is in the playlist.
- \`std::string toString() const\` returns the songs in order, separated by \`", "\` (comma and space): \`"a, b, c"\`. An empty playlist gives \`""\`, and a single song gives just its name, with no trailing separator.

\`size()\`, \`contains()\` and \`toString()\` must be \`const\`, so that they work on a \`const Playlist&\`.

~~~cpp
Playlist p;
p.addSong("Yesterday");
p.addSong("Help!");
p.size();              // 2
p.contains("Help!");   // true
p.contains("help!");   // false: case matters
p.toString();          // "Yesterday, Help!"
~~~`,
    starter: `#include <cstddef>
#include <string>
#include <vector>

class Playlist {
public:
    void addSong(std::string name) {
        // TODO: store the song
    }

    std::size_t size() const {
        return 0;  // TODO
    }

    bool contains(const std::string& name) const {
        return false;  // TODO
    }

    std::string toString() const {
        return "";  // TODO: "a, b, c"
    }

private:
    std::vector<std::string> songs_;
};
`,
    tests: [
      { name: 'a new playlist is empty', code: `Playlist p;
EXPECT_EQ(p.size(), std::size_t{0});
EXPECT_EQ(p.toString(), std::string(""));
EXPECT(!p.contains("anything"));` },
      { name: 'addSong increases size and keeps duplicates', code: `Playlist p;
p.addSong("a");
p.addSong("b");
p.addSong("a");
EXPECT_EQ(p.size(), std::size_t{3});` },
      { name: 'contains matches whole names exactly', code: `Playlist p;
p.addSong("Yesterday");
p.addSong("Help!");
EXPECT(p.contains("Yesterday"));
EXPECT(p.contains("Help!"));
EXPECT(!p.contains("yesterday"));
EXPECT(!p.contains("Yes"));
EXPECT(!p.contains(""));` },
      { name: 'toString joins with comma and space', code: `Playlist p;
p.addSong("a");
p.addSong("b");
p.addSong("c");
EXPECT_EQ(p.toString(), std::string("a, b, c"));
Playlist one;
one.addSong("Hey Jude");
EXPECT_EQ(one.toString(), std::string("Hey Jude"));` },
      { name: 'each playlist has its own songs', code: `Playlist rock;
Playlist jazz;
rock.addSong("Paranoid");
jazz.addSong("So What");
jazz.addSong("Blue in Green");
EXPECT_EQ(rock.size(), std::size_t{1});
EXPECT_EQ(jazz.size(), std::size_t{2});
EXPECT(!rock.contains("So What"));
EXPECT_EQ(rock.toString(), std::string("Paranoid"));
EXPECT_EQ(jazz.toString(), std::string("So What, Blue in Green"));` },
      { name: 'a copy is a separate playlist', code: `Playlist original;
original.addSong("One");
Playlist copy = original;
copy.addSong("Two");
EXPECT_EQ(original.size(), std::size_t{1});
EXPECT_EQ(copy.size(), std::size_t{2});
EXPECT_EQ(original.toString(), std::string("One"));` },
      { name: 'read-only methods are const', code: `auto readOnly = [](const auto& pl) {
    return requires { pl.size(); pl.contains(std::string("x")); pl.toString(); };
};
Playlist p;
EXPECT(readOnly(p));` },
    ],
    hints: [
      'All three read-only functions just inspect `songs_`; `addSong` is the only function that changes it (`songs_.push_back(name)`), which is why it is the only one that is not `const`.',
      'For `contains`, loop over `songs_` and compare each element with `==` (which compares whole `std::string`s, case-sensitively), or use `std::find` from `<algorithm>`.',
      'For `toString`, start with an empty `std::string out;` and loop with an index: before every song except the first (`if (i > 0)`), append `", "`; then append the song.',
    ],
    solution: `#include <algorithm>
#include <cstddef>
#include <string>
#include <utility>
#include <vector>

class Playlist {
public:
    void addSong(std::string name) { songs_.push_back(std::move(name)); }

    std::size_t size() const { return songs_.size(); }

    bool contains(const std::string& name) const {
        return std::find(songs_.begin(), songs_.end(), name) != songs_.end();
    }

    std::string toString() const {
        std::string out;
        for (std::size_t i = 0; i < songs_.size(); ++i) {
            if (i > 0) out += ", ";
            out += songs_[i];
        }
        return out;
    }

private:
    std::vector<std::string> songs_;
};
`,
    explanation: `**The object owns its data.** \`songs_\` is an ordinary (non-\`static\`) data member, so every \`Playlist\` object has its own vector: adding to \`rock\` cannot affect \`jazz\`. Copying a playlist copies the vector too (C++ objects are values), which is why \`copy.addSong("Two")\` leaves \`original\` alone. Keeping \`songs_\` private means the only way to change it is \`addSong\`, so the class fully controls its state.

**\`const\` marks the read-only interface.** \`size()\`, \`contains()\` and \`toString()\` only read \`songs_\`, so they are \`const\` and work through a \`const Playlist&\`. \`contains\` takes its argument by const reference to avoid copying the string; \`addSong\` takes it by value and moves it into the vector, which costs at most one copy whether the caller passes a named string or a temporary.

**Joining without a trailing separator.** \`toString\` appends \`", "\` *before* every element except the first, which handles the empty and single-song cases with no special code. This method is the C++ counterpart of Python's \`__str__\` (or \`", ".join(songs)\`); Module 08 shows how to make \`std::cout << playlist\` work with \`operator<<\`.`,
  },
  {
    id: 'classes-e03', lang: 'python', title: 'Book', difficulty: 1,
    task: `Write a \`Book\` class.

- \`Book(title, author, pages)\` stores the three values as instance attributes \`title\`, \`author\` and \`pages\`.
- A **class attribute** \`count\` records how many \`Book\` objects have been created: it starts at \`0\`, and creating a book increments \`Book.count\`. It must stay a class attribute; instances must not get their own \`count\`.
- \`is_long()\` returns \`True\` if the book has **more than** 300 pages, otherwise \`False\`.
- \`__str__\` returns \`"<title> by <author>"\`, e.g. \`Dune by Frank Herbert\`.
- \`__repr__\` returns code-like text such as \`Book('Dune', 'Frank Herbert', 412)\`. Use \`!r\` for the values, so that a title containing a quote still gives valid Python: \`Book("Ender's Game", 'Orson Scott Card', 324)\`.

~~~python
b = Book("Dune", "Frank Herbert", 412)
print(b)       # Dune by Frank Herbert
print([b])     # [Book('Dune', 'Frank Herbert', 412)]
b.is_long()    # True
Book.count     # 1
~~~`,
    starter: `class Book:
    count = 0  # how many books have been created

    def __init__(self, title, author, pages):
        raise NotImplementedError

    def is_long(self):
        raise NotImplementedError

    def __str__(self):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'stores title, author and pages', code: `b = Book("Dune", "Frank Herbert", 412)
assert (b.title, b.author, b.pages) == ("Dune", "Frank Herbert", 412), "title, author and pages should be stored as attributes"` },
      { name: 'is_long means more than 300 pages', code: `assert Book("Dune", "Frank Herbert", 412).is_long(), "412 pages is long"
assert not Book("Exactly", "A", 300).is_long(), "exactly 300 pages is not long"
assert Book("Just over", "B", 301).is_long(), "301 pages is long"` },
      { name: '__str__ is the readable form', code: `b = Book("Dune", "Frank Herbert", 412)
assert str(b) == "Dune by Frank Herbert", f"got {str(b)!r}"
assert capture(lambda: print(b)) == "Dune by Frank Herbert\\n"` },
      { name: '__repr__ is the code-like form', code: `b = Book("Dune", "Frank Herbert", 412)
assert repr(b) == "Book('Dune', 'Frank Herbert', 412)", f"got {repr(b)!r}"
assert str([b]) == "[Book('Dune', 'Frank Herbert', 412)]", "lists show their items with repr()"
e = Book("Ender's Game", "Orson Scott Card", 324)
assert repr(e) == """Book("Ender's Game", 'Orson Scott Card', 324)""", f"use !r: got {repr(e)}"` },
      { name: 'count tracks books created', code: `assert Book.count == 0, "count should start at 0"
Book("A", "X", 10)
Book("B", "Y", 20)
assert Book.count == 2, f"expected 2 after creating two books, got {Book.count}"` },
      { name: 'count stays a class attribute', code: `b = Book("A", "X", 10)
assert "count" in vars(Book), "count must be defined on the class"
assert "count" not in vars(b), "self.count += 1 creates an instance attribute; update Book.count instead"
assert b.count == 1, "reading b.count should find the class attribute"` },
    ],
    hints: [
      '`__init__` assigns `self.title`, `self.author` and `self.pages`, which creates the instance attributes. `is_long` can simply `return self.pages > 300`.',
      'Update the counter through the class: `Book.count += 1`. Writing `self.count += 1` reads the class value but *assigns* to the instance, creating a shadowing attribute and leaving `Book.count` at 0.',
      'f-strings make both text forms short: `f"{self.title} by {self.author}"` for `__str__`, and `f"Book({self.title!r}, {self.author!r}, {self.pages!r})"` for `__repr__`.',
    ],
    solution: `class Book:
    count = 0  # how many books have been created

    def __init__(self, title, author, pages):
        self.title = title
        self.author = author
        self.pages = pages
        Book.count += 1

    def is_long(self):
        return self.pages > 300

    def __str__(self):
        return f"{self.title} by {self.author}"

    def __repr__(self):
        return f"Book({self.title!r}, {self.author!r}, {self.pages!r})"
`,
    explanation: `**Instance state vs class state.** \`title\`, \`author\` and \`pages\` describe one book, so \`__init__\` stores them on \`self\`, and they land in each object's own \`__dict__\`. \`count\` describes the class as a whole, so it lives on the class and is updated with \`Book.count += 1\`. Writing \`self.count += 1\` would read the class value (0), add 1, and store the result *on the instance*: every book would report 1 while \`Book.count\` stayed 0. The last test checks exactly that with \`vars()\`.

**Two text forms for two audiences.** \`__str__\` is what users see: \`print(b)\`, \`str(b)\`, f-strings. \`__repr__\` is for developers: \`repr(b)\`, the REPL and containers, so \`print([b])\` shows \`[Book('Dune', 'Frank Herbert', 412)]\`. The \`!r\` conversion calls \`repr()\` on each value, which quotes strings correctly even when they contain an apostrophe, so the output stays valid Python.

In C++, \`count\` would be a \`static\` data member (Module 09) and the text forms would be a \`toString()\` member or an \`operator<<\` overload (Module 08).`,
  },
  {
    id: 'classes-e04', lang: 'python', title: 'Fix the shared shopping cart', difficulty: 2,
    task: `The \`ShoppingCart\` in the editor seems to work with one cart, but carts leak into each other as soon as there are two. Fix the class so that every cart is independent. The API stays the same:

- \`ShoppingCart(owner, items=None)\` stores \`owner\`. Every cart has its **own** list \`items\` of \`(name, price)\` tuples, created per instance in \`__init__\`. Remove the class-level \`items = []\`.
- If \`items\` is given, the cart starts with a **copy** of it: changing the caller's list later must not affect the cart, and adding to the cart must not change the caller's list.
- \`add(name, price)\` appends \`(name, price)\` to this cart only and returns the cart itself, so calls can be chained.
- \`total()\` returns the sum of the prices in this cart (\`0\` when it is empty).

~~~python
a = ShoppingCart("Ada")
b = ShoppingCart("Bob")
a.add("apple", 1.5).add("bread", 2.25)
a.total()   # 3.75
b.items     # [] (the starter shows Ada's items here too)
~~~`,
    starter: `class ShoppingCart:
    items = []

    def __init__(self, owner, items=None):
        self.owner = owner
        if items is not None:
            self.items = items

    def add(self, name, price):
        self.items.append((name, price))
        return self

    def total(self):
        return sum(price for _, price in self.items)
`,
    tests: [
      { name: 'two carts are independent', code: `a = ShoppingCart("Ada")
b = ShoppingCart("Bob")
a.add("apple", 1.5)
assert b.items == [], f"Bob's cart should be empty, got {b.items!r}"
assert b.total() == 0, "an empty cart totals 0"
assert a.items == [("apple", 1.5)], f"got {a.items!r}"` },
      { name: 'items is a per-cart attribute', code: `a = ShoppingCart("Ada")
b = ShoppingCart("Bob")
assert "items" in vars(a), "create self.items in __init__"
assert a.items is not b.items, "each cart needs its own list object"
assert "items" not in vars(ShoppingCart), "remove the class-level items list"` },
      { name: 'starting items are copied', code: `start = [("pen", 2.0)]
c = ShoppingCart("Cy", start)
c.add("ink", 3.0)
assert start == [("pen", 2.0)], "adding to the cart must not change the caller's list"
start.append(("paper", 1.0))
assert c.items == [("pen", 2.0), ("ink", 3.0)], f"the cart should keep its own copy, got {c.items!r}"
assert c.total() == 5.0` },
      { name: 'add chains and total sums', code: `cart = ShoppingCart("Ada")
assert cart.add("apple", 1.5) is cart, "add() should return the cart itself"
cart.add("bread", 2.25)
assert cart.total() == 3.75, f"expected 3.75, got {cart.total()!r}"
assert cart.owner == "Ada"` },
      { name: 'carts created later start empty', code: `first = ShoppingCart("A", [("x", 1.0)])
second = ShoppingCart("B")
third = ShoppingCart("C")
second.add("y", 2.0)
assert third.items == [], f"a new cart must start empty, got {third.items!r}"
assert first.items == [("x", 1.0)], f"got {first.items!r}"` },
    ],
    hints: [
      '`items = []` in the class body runs once, so there is exactly one list, stored on the class. `self.items.append(...)` finds that list through the class and mutates it, so every cart without its own `items` shares it.',
      'Give each cart its own list in `__init__`: `self.items = []`. Then delete the class-level line; once every instance sets its own attribute, it is dead code that only misleads readers.',
      'For the starting items, `self.items = items` would make the cart and the caller share one list (call by sharing). Copy it instead: `self.items = list(items) if items is not None else []`.',
    ],
    solution: `class ShoppingCart:
    def __init__(self, owner, items=None):
        self.owner = owner
        self.items = list(items) if items is not None else []

    def add(self, name, price):
        self.items.append((name, price))
        return self

    def total(self):
        return sum(price for _, price in self.items)
`,
    explanation: `**Two bugs, one root cause: shared objects.** In the starter, \`items = []\` is a class attribute: one list, created when the class body ran. Carts created without items never get an \`items\` attribute of their own, so \`self.items\` finds the class's list and \`append\` mutates it for everyone. Carts created *with* items do get an instance attribute, but it is the caller's own list (Python passes by sharing), so the cart and the caller silently modify the same object.

**The fix: per-instance state, created in \`__init__\`.** \`self.items = list(items) if items is not None else []\` gives every cart a brand-new list: an empty one, or a copy of the starting items. Each object now owns its state, which is the whole point of having objects with their own identity. \`add\` still returns \`self\`, so calls chain on the same cart.

**Why \`items=None\` and not \`items=[]\`?** A default value is evaluated once, when \`def\` runs, so \`def __init__(self, owner, items=[])\` would recreate this very bug: every cart built without items would share the single default list. \`None\` as a sentinel plus a fresh list inside the function is the standard idiom. In C++ an ordinary \`std::vector\` data member would make this mistake impossible; sharing requires an explicit \`static\`.`,
  },
];
