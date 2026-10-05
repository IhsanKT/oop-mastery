export default [
  {
    id: 'copy-move-e01', lang: 'cpp', title: 'IntBuffer: a deep-copying owner', difficulty: 3,
    task: `Write \`class IntBuffer\`, which owns a heap array of \`int\` through a raw \`int*\` (no \`std::vector\`).

- \`explicit IntBuffer(std::size_t size)\` allocates \`size\` ints, all zero.
- \`std::size_t size() const\`, and \`int& operator[](std::size_t)\` plus \`const int& operator[](std::size_t) const\`.
- A **destructor** that frees the array.
- A **deep copy constructor**: the copy has its own array with the same values.
- A **copy assignment** written with **copy-and-swap** (take the argument by value, swap, return \`*this\`). It must be safe for self-assignment, and assigning a buffer of a different size must work.

~~~cpp
IntBuffer a(3);
a[0] = 7;
IntBuffer b = a;   // deep copy
b[0] = 99;         // a[0] is still 7
b = a;             // copy-and-swap assignment
~~~`,
    starter: `#include <cstddef>
#include <utility>

class IntBuffer {
    int* data_;
    std::size_t size_;
public:
    explicit IntBuffer(std::size_t size) : data_(new int[size]()), size_(size) {}
    // TODO: destructor, deep copy constructor, copy-and-swap assignment
    IntBuffer(const IntBuffer& o) : data_(o.data_), size_(o.size_) {}   // shallow!

    std::size_t size() const { return size_; }
    int& operator[](std::size_t i) { return data_[i]; }
    const int& operator[](std::size_t i) const { return data_[i]; }
};
`,
    tests: [
      { name: 'size and zero initialization', code: `IntBuffer a(4);
EXPECT_EQ(a.size(), std::size_t(4));
for (std::size_t i = 0; i < 4; ++i) EXPECT_EQ(a[i], 0);
a[2] = 5;
EXPECT_EQ(a[2], 5);
const IntBuffer& c = a;
EXPECT_EQ(c[2], 5);` },
      { name: 'copy constructor is deep', code: `IntBuffer a(3);
a[0] = 1; a[1] = 2; a[2] = 3;
IntBuffer b = a;
EXPECT_EQ(b.size(), std::size_t(3));
EXPECT_EQ(b[1], 2);
b[1] = 99;
EXPECT_EQ(a[1], 2);
a[0] = -1;
EXPECT_EQ(b[0], 1);` },
      { name: 'copy assignment is deep, also for different sizes', code: `IntBuffer a(2);
a[0] = 10; a[1] = 20;
IntBuffer b(5);
b[4] = 7;
b = a;
EXPECT_EQ(b.size(), std::size_t(2));
EXPECT_EQ(b[0], 10);
EXPECT_EQ(b[1], 20);
b[0] = 0;
EXPECT_EQ(a[0], 10);` },
      { name: 'self-assignment is safe', code: `IntBuffer a(3);
a[0] = 4; a[1] = 5; a[2] = 6;
IntBuffer& alias = a;
a = alias;
EXPECT_EQ(a.size(), std::size_t(3));
EXPECT_EQ(a[0], 4);
EXPECT_EQ(a[2], 6);` },
      { name: 'copies can be destroyed independently', code: `IntBuffer a(3);
a[0] = 8;
{
    IntBuffer b = a;
    IntBuffer c(1);
    c = b;
}
EXPECT_EQ(a[0], 8);` },
    ],
    hints: [
      'The destructor is \`~IntBuffer() { delete[] data_; }\`. The copy constructor allocates a new array and copies the values with \`std::copy\`.',
      'Copy assignment: \`IntBuffer& operator=(IntBuffer other) noexcept\` receives a by-value copy built by your copy constructor.',
      'Inside, \`std::swap(data_, other.data_); std::swap(size_, other.size_); return *this;\`. The parameter\'s destructor frees the old array.',
    ],
    solution: `#include <algorithm>
#include <cstddef>
#include <utility>

class IntBuffer {
    int* data_;
    std::size_t size_;
public:
    explicit IntBuffer(std::size_t size) : data_(new int[size]()), size_(size) {}
    ~IntBuffer() { delete[] data_; }

    IntBuffer(const IntBuffer& o) : data_(new int[o.size_]), size_(o.size_) {
        std::copy(o.data_, o.data_ + size_, data_);
    }

    IntBuffer& operator=(IntBuffer other) noexcept {   // copy-and-swap
        std::swap(data_, other.data_);
        std::swap(size_, other.size_);
        return *this;
    }

    std::size_t size() const { return size_; }
    int& operator[](std::size_t i) { return data_[i]; }
    const int& operator[](std::size_t i) const { return data_[i]; }
};
`,
    explanation: `**Rule of Three in action.** The class owns a raw pointer, so it needs a destructor, a copy constructor and a copy assignment. The copy constructor allocates a **new** array and copies the elements, which makes copies independent (a deep copy).

**Copy-and-swap.** \`operator=\` takes its argument **by value**: the copy constructor builds a private copy first (if \`new\` throws, \`*this\` is untouched). Swapping the guts then gives \`*this\` the new data, and the parameter's destructor releases the old array when the function returns. Self-assignment works automatically (it copies itself, then swaps), and the operator needs no \`if (this != &o)\` check and no repeated copy logic.

The principle is ownership: exactly one object is responsible for freeing each array.`,
  },
  {
    id: 'copy-move-e02', lang: 'cpp', title: 'IntBuffer gets move semantics', difficulty: 3,
    task: `Below is a correct deep-copying \`IntBuffer\` (the Rule of Three). Add the two missing operations to make it a Rule of Five class:

- \`IntBuffer(IntBuffer&&) noexcept\` steals the array. The source must be left valid and empty: \`size() == 0\`.
- \`IntBuffer& operator=(IntBuffer&&) noexcept\` releases the current array, steals the other one and leaves the source empty (guard against \`a = std::move(a)\`).

Do not change the copy operations. Moving must not copy elements: the new buffer must use the same memory block as the original. Pushing many buffers into a \`std::vector\` must work.

~~~cpp
IntBuffer a(1000);
IntBuffer b = std::move(a);   // b owns the array, a.size() == 0
~~~`,
    starter: `#include <algorithm>
#include <cstddef>
#include <utility>
#include <vector>

class IntBuffer {
    int* data_;
    std::size_t size_;
public:
    explicit IntBuffer(std::size_t size) : data_(new int[size]()), size_(size) {}
    ~IntBuffer() { delete[] data_; }

    IntBuffer(const IntBuffer& o) : data_(new int[o.size_]), size_(o.size_) {
        std::copy(o.data_, o.data_ + size_, data_);
    }
    IntBuffer& operator=(const IntBuffer& o) {
        IntBuffer tmp(o);
        std::swap(data_, tmp.data_);
        std::swap(size_, tmp.size_);
        return *this;
    }

    // TODO: noexcept move constructor and move assignment

    std::size_t size() const { return size_; }
    int& operator[](std::size_t i) { return data_[i]; }
    const int& operator[](std::size_t i) const { return data_[i]; }
};
`,
    tests: [
      { name: 'move constructor steals and empties the source', code: `IntBuffer a(3);
a[0] = 1; a[1] = 2; a[2] = 3;
const int* p = &a[0];
IntBuffer b(std::move(a));
EXPECT_EQ(b.size(), std::size_t(3));
EXPECT_EQ(b[2], 3);
EXPECT(&b[0] == p);            // same block: nothing was copied
EXPECT_EQ(a.size(), std::size_t(0));` },
      { name: 'move assignment steals and empties the source', code: `IntBuffer a(2);
a[0] = 5; a[1] = 6;
const int* p = &a[0];
IntBuffer b(10);
b = std::move(a);
EXPECT_EQ(b.size(), std::size_t(2));
EXPECT_EQ(b[1], 6);
EXPECT(&b[0] == p);
EXPECT_EQ(a.size(), std::size_t(0));` },
      { name: 'moves are noexcept', code: `EXPECT((std::is_nothrow_move_constructible_v<IntBuffer>));
EXPECT((std::is_nothrow_move_assignable_v<IntBuffer>));` },
      { name: 'copies still copy', code: `IntBuffer a(2);
a[0] = 9;
IntBuffer b = a;
b[0] = 1;
EXPECT_EQ(a[0], 9);
IntBuffer c(1);
c = a;
EXPECT_EQ(c[0], 9);
EXPECT_EQ(a.size(), std::size_t(2));` },
      { name: 'works in a growing vector', code: `std::vector<IntBuffer> v;
for (int i = 0; i < 200; ++i) {
    v.push_back(IntBuffer(4));
    v.back()[0] = i;
}
EXPECT_EQ(v.size(), std::size_t(200));
for (int i = 0; i < 200; ++i) EXPECT_EQ(v[i][0], i);` },
    ],
    hints: [
      'Move constructor initializer list: \`data_(o.data_), size_(o.size_)\`, then in the body set \`o.data_ = nullptr; o.size_ = 0;\`.',
      'Move assignment: \`if (this != &o) { delete[] data_; data_ = o.data_; size_ = o.size_; o.data_ = nullptr; o.size_ = 0; } return *this;\`.',
      'Mark both \`noexcept\`. \`delete[] nullptr\` is harmless, so the moved-from object can be destroyed safely.',
    ],
    solution: `#include <algorithm>
#include <cstddef>
#include <utility>
#include <vector>

class IntBuffer {
    int* data_;
    std::size_t size_;
public:
    explicit IntBuffer(std::size_t size) : data_(new int[size]()), size_(size) {}
    ~IntBuffer() { delete[] data_; }

    IntBuffer(const IntBuffer& o) : data_(new int[o.size_]), size_(o.size_) {
        std::copy(o.data_, o.data_ + size_, data_);
    }
    IntBuffer& operator=(const IntBuffer& o) {
        IntBuffer tmp(o);
        std::swap(data_, tmp.data_);
        std::swap(size_, tmp.size_);
        return *this;
    }

    IntBuffer(IntBuffer&& o) noexcept : data_(o.data_), size_(o.size_) {
        o.data_ = nullptr;
        o.size_ = 0;
    }
    IntBuffer& operator=(IntBuffer&& o) noexcept {
        if (this != &o) {
            delete[] data_;
            data_ = o.data_;
            size_ = o.size_;
            o.data_ = nullptr;
            o.size_ = 0;
        }
        return *this;
    }

    std::size_t size() const { return size_; }
    int& operator[](std::size_t i) { return data_[i]; }
    const int& operator[](std::size_t i) const { return data_[i]; }
};
`,
    explanation: `**Stealing instead of copying.** The move constructor takes the pointer and size from the source in constant time and then puts the source into a valid, empty state (\`nullptr\`, size 0), so its destructor (\`delete[] nullptr\`) is harmless. Move assignment first releases what the target owns, then steals; the \`this != &o\` guard keeps \`a = std::move(a)\` from freeing its own data.

**Why \`noexcept\`.** Nothing in a move can throw, and saying so lets \`std::vector\` use \`std::move_if_noexcept\` when it reallocates: without it the vector would copy all the elements on every growth to preserve its exception guarantee.

Declaring the copy operations suppresses the implicit moves, which is why the Rule of Five says to define all five (or none, following the Rule of Zero).`,
  },
  {
    id: 'copy-move-e03', lang: 'python', title: 'Deep copy that keeps the owner', difficulty: 3,
    task: `Write \`class Document(title, tags, metadata, owner)\` that stores those four values as attributes of the same names.

- \`__deepcopy__(self, memo)\` returns a new \`Document\` whose \`tags\` (list) and \`metadata\` (dict, possibly with nested lists) are **deep copies** (pass \`memo\` along), but whose \`owner\` is the **same object**, not a copy. \`title\` is just copied over.
- \`clone()\` returns \`copy.deepcopy(self)\`.

~~~python
owner = User("ada")
d = Document("Plan", ["a"], {"refs": [1, 2]}, owner)
c = d.clone()
c.tags.append("b")     # d.tags is still ['a']
c.owner is d.owner     # True
~~~`,
    starter: `import copy


class Document:
    def __init__(self, title, tags, metadata, owner):
        self.title = title
        self.tags = tags
        self.metadata = metadata
        self.owner = owner

    def __deepcopy__(self, memo):
        raise NotImplementedError

    def clone(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'clone is a separate Document', code: `class U: pass
d = Document("Plan", ["a"], {"refs": [1, 2]}, U())
c = d.clone()
assert isinstance(c, Document) and c is not d
assert c.title == "Plan"
assert c.tags == ["a"] and c.metadata == {"refs": [1, 2]}` },
      { name: 'tags and metadata are independent', code: `class U: pass
d = Document("Plan", ["a"], {"refs": [1, 2]}, U())
c = d.clone()
c.tags.append("b")
c.metadata["refs"].append(3)
c.metadata["new"] = 1
assert d.tags == ["a"], d.tags
assert d.metadata == {"refs": [1, 2]}, d.metadata` },
      { name: 'the owner is shared, not copied', code: `class U:
    pass
u = U()
d = Document("Plan", [], {}, u)
c = d.clone()
assert c.owner is u
import copy
c2 = copy.deepcopy(d)
assert c2.owner is u and c2 is not d` },
      { name: 'works with copy.deepcopy and shared memo', code: `import copy
class U: pass
u = U()
d = Document("Plan", ["x"], {}, u)
pair = copy.deepcopy([d, d])
assert pair[0] is pair[1], "memo must keep shared references shared"
assert pair[0] is not d
assert pair[0].owner is u` },
    ],
    hints: [
      'In \`__deepcopy__\` build \`Document(self.title, copy.deepcopy(self.tags, memo), copy.deepcopy(self.metadata, memo), self.owner)\`.',
      'Passing \`self.owner\` directly (not deep-copied) is what keeps its identity.',
      '\`clone\` is just \`return copy.deepcopy(self)\`; that calls your \`__deepcopy__\` with a fresh memo.',
    ],
    solution: `import copy


class Document:
    def __init__(self, title, tags, metadata, owner):
        self.title = title
        self.tags = tags
        self.metadata = metadata
        self.owner = owner

    def __deepcopy__(self, memo):
        return Document(
            self.title,
            copy.deepcopy(self.tags, memo),
            copy.deepcopy(self.metadata, memo),
            self.owner,          # shared on purpose
        )

    def clone(self):
        return copy.deepcopy(self)
`,
    explanation: `**Customizing deep copy.** \`copy.deepcopy(x)\` calls \`x.__deepcopy__(memo)\` if it exists. The method decides, field by field, what is duplicated and what is shared: \`tags\` and \`metadata\` are deep-copied (passing \`memo\` along, so shared or cyclic references inside them are copied only once), while \`owner\` is reused because a document's owner is an identity, not part of its value.

\`deepcopy\` records the result for the whole object in \`memo\` itself, so \`copy.deepcopy([d, d])\` yields two references to the same copy. In C++ you make the same decision when writing a copy constructor: copy a value member, or copy the pointer to share the target.`,
  },
  {
    id: 'copy-move-e04', lang: 'python', title: 'Fix the mutable defaults', difficulty: 2,
    task: `The starter has two functions with the **mutable default argument** bug. Fix them.

- \`Team(name, members=None)\` stores \`self.name\` and \`self.members\`: a **new list** made from \`members\` if given (the caller's list must not be aliased), otherwise a fresh empty list. \`add(member)\` appends to \`self.members\`.
- \`append_log(entry, log=None)\` appends \`entry\` to \`log\` and returns it; when no \`log\` is passed it starts a **fresh list** on every call. A log passed in is modified in place and returned.

~~~python
a, b = Team("a"), Team("b")
a.add("ann")
b.members          # []
append_log("x")    # ['x']
append_log("y")    # ['y'], not ['x', 'y']
~~~`,
    starter: `class Team:
    def __init__(self, name, members=[]):
        self.name = name
        self.members = members

    def add(self, member):
        self.members.append(member)


def append_log(entry, log=[]):
    log.append(entry)
    return log
`,
    tests: [
      { name: 'teams do not share default members', code: `a, b = Team("a"), Team("b")
a.add("ann")
assert a.members == ["ann"]
assert b.members == [], b.members
assert Team("c").members == []` },
      { name: 'the passed list is copied', code: `names = ["x", "y"]
t = Team("t", names)
t.add("z")
assert names == ["x", "y"], "caller's list must not change"
assert t.members == ["x", "y", "z"]` },
      { name: 'append_log starts fresh each time', code: `a = append_log("x")
b = append_log("y")
assert a == ["x"], a
assert b == ["y"], b
assert a is not b` },
      { name: 'append_log uses a given log in place', code: `log = ["start"]
result = append_log("go", log)
assert result is log
assert log == ["start", "go"]
import inspect
assert inspect.signature(append_log).parameters["log"].default is None
assert inspect.signature(Team).parameters["members"].default is None` },
    ],
    hints: [
      'Change both defaults to \`None\`.',
      'In \`Team.__init__\` use \`self.members = list(members) if members is not None else []\`.',
      'In \`append_log\`, start with \`if log is None: log = []\`, then append and return.',
    ],
    solution: `class Team:
    def __init__(self, name, members=None):
        self.name = name
        self.members = list(members) if members is not None else []

    def add(self, member):
        self.members.append(member)


def append_log(entry, log=None):
    if log is None:
        log = []
    log.append(entry)
    return log
`,
    explanation: `**The bug.** Default values are evaluated **once**, when \`def\` runs, so \`members=[]\` creates a single list that every \`Team\` created without \`members\` shares, and \`append_log\` keeps appending to one list forever. Python's assignment never copies, so \`self.members = members\` also aliases whatever the caller passed in.

**The fix.** Use \`None\` as a sentinel and create the list inside the function, which runs on every call. \`list(members)\` makes an explicit shallow copy so the object owns its data. This is the same ownership question as C++'s copy constructor: who owns this list?`,
  },
];
