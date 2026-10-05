## What does "copy" mean?

Suppose a `Buffer` owns a heap array. If copying an object just copies its fields, both objects end up pointing at the same array: a **shallow copy**. Change one and the other changes; destroy one and the other dangles. A **deep copy** duplicates the owned resource so the objects are independent. Choosing which one your class does, and keeping it correct, is the subject of this module.

~~~cpp
class Buffer {
    int* data_; std::size_t n_;
public:
    explicit Buffer(std::size_t n) : data_(new int[n]{}), n_(n) {}
    ~Buffer() { delete[] data_; }
};
Buffer a(4);
Buffer b = a;   // compiler-generated copy: copies the POINTER
// at scope end both destructors run delete[] on the same block: double free
~~~
~~~python
a = [1, 2, 3]
b = a            # no copy at all: two names, one list
b.append(4)
print(a)         # [1, 2, 3, 4]
~~~

> **C++ vs Python:** In C++ `Buffer b = a;` creates a new object by running the copy constructor. In Python `b = a` never copies; it binds another name to the same object.

## Copy constructor, copy assignment, copy-and-swap

~~~cpp
class Buffer {
    int* data_; std::size_t n_;
public:
    explicit Buffer(std::size_t n) : data_(new int[n]{}), n_(n) {}
    ~Buffer() { delete[] data_; }

    Buffer(const Buffer& o) : data_(new int[o.n_]), n_(o.n_) {      // construct a NEW object
        std::copy(o.data_, o.data_ + n_, data_);
    }
    Buffer& operator=(Buffer o) noexcept {                          // copy-and-swap
        std::swap(data_, o.data_);                                  // o is a copy made by the caller
        std::swap(n_, o.n_);
        return *this;                                               // o's destructor frees the old data
    }
};
Buffer b = a;   // copy constructor (initialization)
Buffer c(2);
c = a;          // copy assignment (c already exists)
~~~
~~~python
import copy

class Buffer:
    def __init__(self, items): self.items = list(items)
    def __copy__(self):                 # copy.copy(b)
        return Buffer(self.items)       # new list: effectively deep for this class
~~~

`T b = a;` and `T b(a);` call the copy **constructor**; `c = a;` on an existing object calls copy **assignment**. A naive assignment `delete[] data_; data_ = new int[o.n_]; copy(...)` breaks on `a = a` (it deletes the data it is about to copy) and leaks if `new` throws. **Copy-and-swap** takes the argument by value (the copy happens first, and may throw before anything changes), swaps, and lets the temporary free the old state. It is self-assignment safe.

## The Rule of Three, Five and Zero

If a class needs a user-defined destructor, copy constructor or copy assignment, it almost certainly needs **all three** (**Rule of Three**): they all exist because the class manages a resource. C++11 adds the move constructor and move assignment, giving the **Rule of Five**.

The better aim is the **Rule of Zero**: hold resources in members that already manage themselves (`std::vector`, `std::string`, `std::unique_ptr`) and write none of the five.

~~~cpp
class Buffer {                       // Rule of Zero
    std::vector<int> data_;
public:
    explicit Buffer(std::size_t n) : data_(n) {}
};                                   // copy, move and destructor are all correct already
~~~
~~~python
class Buffer:                        # Python's GC manages memory; nothing to write
    def __init__(self, n): self.items = [0] * n
~~~

## Move semantics

An **rvalue** is a temporary or an object you have marked as expendable. Instead of copying its resource, a **move** steals it and leaves the source empty but valid.

~~~cpp
Buffer(Buffer&& o) noexcept : data_(o.data_), n_(o.n_) {  // steal
    o.data_ = nullptr; o.n_ = 0;                          // leave a valid empty state
}
Buffer& operator=(Buffer&& o) noexcept {
    if (this != &o) { delete[] data_; data_ = o.data_; n_ = o.n_; o.data_ = nullptr; o.n_ = 0; }
    return *this;
}

Buffer a(1000);
Buffer b = std::move(a);   // std::move only casts a to Buffer&&; the move ctor does the work
// a is moved-from: valid but unspecified (here: empty). Assign to it or destroy it.
~~~
~~~python
# Python has no move semantics: names are references, so handing an object over is free.
a = [0] * 1000
b = a            # "moved" in spirit: same object
a = None         # drop the old name if you want it to look gone
~~~

`std::move` does not move anything; it is just `static_cast<T&&>`. The **moved-from** object must stay destructible and assignable; do not rely on its contents. Mark moves `noexcept`: `std::vector` reallocation uses `std::move_if_noexcept`, so if your move constructor can throw, the vector copies every element instead.

> **Under the hood:** Vector growth must keep its strong exception guarantee. A throwing move could leave elements half-moved with no way back, so a potentially throwing move is not used when a copy is available.

## `= default`, `= delete`, and copy elision

~~~cpp
class Connection {
public:
    Connection() = default;
    Connection(const Connection&) = delete;             // non-copyable
    Connection& operator=(const Connection&) = delete;
    Connection(Connection&&) noexcept = default;        // but movable
};

Buffer make() { return Buffer(8); }   // C++17: guaranteed elision, no copy or move at all
Buffer x = make();                    // x is constructed directly in place
~~~
~~~python
class Connection:
    def __copy__(self):
        raise TypeError("Connection cannot be copied")
~~~

`= delete` turns an operation into a compile error, the right tool for unique ownership. Since C++17 initializing an object from a prvalue (`return Buffer(8);`) constructs it directly in its destination: the result needs neither a copy nor a move constructor.

## Python: shallow, deep, and traps

~~~cpp
// C++ std::vector<std::vector<int>> copies deeply by default:
std::vector<std::vector<int>> a{{1, 2}};
auto b = a;           // inner vectors are copied too
b[0].push_back(3);    // a[0] is still {1, 2}
~~~
~~~python
import copy
a = [[1, 2], [3]]
shallow = copy.copy(a)        # also a[:] and list(a): new outer list, SAME inner lists
deep = copy.deepcopy(a)       # everything duplicated
a[0].append(99)
shallow[0]    # [1, 2, 99]: shared
deep[0]       # [1, 2]: independent
~~~

`__deepcopy__(self, memo)` customizes deep copies; `memo` maps object ids to copies already made, so shared or cyclic references are duplicated once, and you can put an object in it to *keep sharing* it:

~~~cpp
// In C++ you choose per member: copy the value, or hold a pointer/reference to share.
struct Doc { std::vector<std::string> tags; const Owner* owner; };  // copy tags, share owner
~~~
~~~python
class Doc:
    def __init__(self, tags, owner): self.tags, self.owner = tags, owner
    def __deepcopy__(self, memo):
        memo[id(self.owner)] = self.owner            # reuse the owner, do not clone it
        return Doc(copy.deepcopy(self.tags, memo), copy.deepcopy(self.owner, memo))
~~~

**The mutable default trap:**

~~~cpp
// C++ default arguments are evaluated on every call, so there is no trap:
void add(int x, std::vector<int> log = {}) { log.push_back(x); }
~~~
~~~python
def add(x, log=[]):        # the list is created ONCE, when def runs
    log.append(x)
    return log
add(1); add(2)             # [1, 2]: the "empty" default accumulates

def add(x, log=None):      # the fix: create a fresh list per call
    if log is None:
        log = []
    log.append(x)
    return log
~~~

A tuple is immutable, but its elements are not: `t = ([1],); t[0].append(2)` works. `t[0] += [3]` appends *and then* raises `TypeError` when it tries to rebind the tuple slot.

## Key takeaways

- A shallow copy shares resources; a deep copy duplicates them. Owning raw pointers need a deep copy or no copy.
- Copy constructor builds a new object; copy assignment replaces an existing one. Copy-and-swap makes assignment safe and simple.
- Rule of Three: destructor, copy constructor and copy assignment come together; Rule of Five adds the moves.
- Prefer the Rule of Zero: let `std::vector`, `std::string` and smart pointers manage resources.
- `std::move` is only a cast to an rvalue; the move constructor does the stealing and leaves a valid, empty source.
- Mark moves `noexcept` so `std::vector` can use them when it grows.
- `= delete` forbids copying; C++17 guarantees elision when initializing from a prvalue.
- In Python assignment never copies; use `copy.copy`, `copy.deepcopy`, and never `=[]` as a default.

## Common pitfalls

- A raw owning pointer with the compiler-generated copy: double delete at scope end.
- A naive `operator=` that deletes first: breaks on `a = a` and is not exception safe.
- Reading a moved-from object as if it still held its old value.
- Believing `std::move(x)` alone moved the object; without a move constructor it silently copies.
- Using `[:]`, `list()` or `copy.copy` on nested data and expecting independence.
- A mutable default argument (`def f(x, items=[])`) shared across all calls.
