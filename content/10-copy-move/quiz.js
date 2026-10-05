export default [
  {
    id: 'copy-move-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is the difference between a shallow copy and a deep copy of an object that refers to other objects (or owns heap memory)?',
    options: [
      { text: 'A shallow copy duplicates the object but shares what it refers to; a deep copy duplicates the referred-to data as well.', correct: true, why: 'Right. Shallow copies share nested or owned data, so changes through one copy are visible through the other.' },
      { text: 'A shallow copy is read-only; a deep copy can be modified.', correct: false, why: 'Both copies are ordinary mutable objects; the difference is only what they share.' },
      { text: 'A shallow copy is faster because it never allocates memory.', correct: false, why: 'A shallow copy still creates a new outer object. Speed is a side effect, not the definition.' },
      { text: 'A deep copy only copies the top-level fields, and a shallow copy copies everything recursively.', correct: false, why: 'This reverses the terms: deep means recursive duplication.' },
    ],
    explanation: `Copying must decide what happens to things the object *points at*. Shallow copy copies the pointer or reference (so two objects share the target); deep copy creates a new target as well. In C++ a class that owns a raw pointer needs a user-written deep copy; in Python \`copy.copy\` is shallow and \`copy.deepcopy\` is deep.`,
  },
  {
    id: 'copy-move-q02', lang: 'cpp', type: 'output', difficulty: 1,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct A {
    A() { std::cout << "ctor "; }
    A(const A&) { std::cout << "copy "; }
    A& operator=(const A&) { std::cout << "assign "; return *this; }
};

int main() {
    A a;
    A b = a;
    A c;
    c = a;
    std::cout << "\\n";
}`,
    options: [
      { text: 'ctor copy ctor assign', correct: true, why: '`A b = a;` initializes a new object (copy constructor); `c = a;` assigns to the existing `c` (copy assignment).' },
      { text: 'ctor assign ctor assign', correct: false, why: 'The `=` in `A b = a;` is initialization syntax, not assignment, so it uses the copy constructor.' },
      { text: 'ctor copy ctor copy', correct: false, why: '`c = a;` happens after `c` already exists, so it is an assignment, not a construction.' },
      { text: 'ctor ctor copy assign', correct: false, why: '`b` is not default-constructed first; it is created directly by the copy constructor.' },
    ],
    explanation: `Initialization (\`A b = a;\`, \`A b(a);\`) always constructs a new object, here via the copy constructor. Assignment (\`c = a;\`) acts on an object that already exists and calls \`operator=\`. They have different jobs: construction starts from raw storage, assignment must clean up the old state.`,
  },
  {
    id: 'copy-move-q03', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'This program crashes (or corrupts memory) when `main` ends. What is the bug?',
    codeLang: 'cpp',
    code: `class Buffer {
    int* data_;
public:
    explicit Buffer(int n) : data_(new int[n]) {}
    ~Buffer() { delete[] data_; }
};

int main() {
    Buffer a(4);
    Buffer b = a;
}`,
    options: [
      { text: 'The compiler-generated copy constructor copies the pointer, so both destructors `delete[]` the same block (double free).', correct: true, why: 'Right. The default copy is shallow; the class owns a resource but did not define a deep copy.' },
      { text: '`delete[]` must be replaced by `delete` because the array was allocated with `new`.', correct: false, why: '`new int[n]` pairs with `delete[]`; the pairing here is correct.' },
      { text: 'The constructor is `explicit`, so `Buffer b = a;` is invalid.', correct: false, why: '`explicit` affects converting constructors from an `int`, not the copy constructor.' },
      { text: '`b` is destroyed before `a`, which corrupts `a`.', correct: false, why: 'Destruction order is fine; the problem is that both objects own the same memory.' },
    ],
    explanation: `A class with a destructor that releases a resource needs a real copy constructor and copy assignment (the **Rule of Three**). Without them the implicit copy duplicates the pointer. Fix with a deep copy (allocate and copy the elements), by deleting copying, or best by using \`std::vector<int>\` so the Rule of Zero applies.`,
  },
  {
    id: 'copy-move-q04', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does the Rule of Three say?',
    options: [
      { text: 'If a class needs a user-defined destructor, copy constructor or copy assignment operator, it probably needs all three.', correct: true, why: 'Right. Needing any one of them signals that the class manages a resource that the default copy would mishandle.' },
      { text: 'A class may have at most three constructors.', correct: false, why: 'There is no limit on the number of constructors; the rule is about special member functions.' },
      { text: 'Every class must define exactly three data members.', correct: false, why: 'The rule says nothing about members; it concerns resource-managing special functions.' },
      { text: 'Copying an object should always take three steps: allocate, copy, free.', correct: false, why: 'That is not what the rule describes; it only says to define the three functions together.' },
    ],
    explanation: `The three are the destructor, the copy constructor and the copy assignment operator. They exist together because they all deal with owned resources: the destructor releases it, the copy operations duplicate it. Since C++11 the move operations make it the Rule of Five, and the best outcome is the Rule of Zero.`,
  },
  {
    id: 'copy-move-q05', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'After this code runs, what does `w.size()` return?',
    codeLang: 'cpp',
    code: `std::vector<int> v = {1, 2, 3};
auto w = std::move(v);`,
    options: [
      { text: '3: `w` took over the elements of `v`.', correct: true, why: 'Right. `std::vector`\'s move constructor steals the internal buffer, so `w` holds all three elements.' },
      { text: '0, because `std::move` empties whichever vector it is applied to.', correct: false, why: '`std::move` only casts; the emptying of `v` is a side effect of the move constructor, and `w` is the new owner.' },
      { text: '6: both vectors keep a copy and they are merged.', correct: false, why: 'A move does not duplicate; elements end up in exactly one place.' },
      { text: 'It does not compile; vectors cannot be moved.', correct: false, why: '`std::vector` has had a move constructor since C++11.' },
    ],
    explanation: `\`auto w = std::move(v);\` casts \`v\` to an rvalue so the move constructor is chosen. \`w\` receives \`v\`'s heap buffer in constant time. \`v\` is left in a valid but unspecified state (in practice empty), so you should assign to it or destroy it rather than read its contents.`,
  },
  {
    id: 'copy-move-q06', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print (C++17 or later)?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct A {
    A() { std::cout << "ctor\\n"; }
    A(const A&) { std::cout << "copy\\n"; }
    A(A&&) { std::cout << "move\\n"; }
    ~A() { std::cout << "dtor\\n"; }
};

A make() { return A(); }

int main() {
    A a = make();
    std::cout << "done\\n";
}`,
    options: [
      { text: 'ctor\ndone\ndtor', correct: true, why: 'Since C++17 initializing from a prvalue constructs the object directly in `a`: no copy or move happens.' },
      { text: 'ctor\nmove\ndtor\ndone\ndtor', correct: false, why: 'That models the old behaviour with a temporary that is moved into `a`; guaranteed elision removes the temporary.' },
      { text: 'ctor\ncopy\ndtor\ndone\ndtor', correct: false, why: 'A copy would only be used if no move existed and elision did not apply; here neither is needed.' },
      { text: 'ctor\nmove\ndone\ndtor', correct: false, why: 'There is no move at all, and there is only one object, so only one destructor line.' },
    ],
    explanation: `C++17 made copy elision **mandatory** when an object is initialized from a prvalue such as \`A()\` or a function returning one. Only one \`A\` ever exists, constructed directly in the caller's variable, so \`A\` does not even need an accessible copy or move constructor for this code.`,
  },
  {
    id: 'copy-move-q07', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does `std::move(x)` actually do?',
    options: [
      { text: 'It casts `x` to an rvalue reference (`static_cast<T&&>`), allowing a move constructor or assignment to be selected; it moves nothing by itself.', correct: true, why: 'Right. The actual transfer happens in the move constructor/assignment that the cast makes eligible.' },
      { text: 'It moves the object to a new memory address and destroys the original.', correct: false, why: 'Objects never relocate; `std::move` does not touch memory at all.' },
      { text: 'It copies `x` more efficiently than a copy constructor.', correct: false, why: 'It performs no copy; if the type has no move constructor, the copy constructor is used instead.' },
      { text: 'It guarantees that `x` is empty afterwards.', correct: false, why: 'Only the type\'s move operation decides what `x` contains afterwards; it is valid but unspecified.' },
    ],
    explanation: `\`std::move\` is a named cast, nothing more. It tells overload resolution "this object may be pillaged". If the type provides \`T(T&&)\`, that function steals the resources; if not, the copy constructor binds to the rvalue and the object is silently copied.`,
  },
  {
    id: 'copy-move-q08', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'Why should a class\'s move constructor be declared `noexcept` if it can be?',
    options: [
      { text: '`std::vector` growth uses `std::move_if_noexcept`: with a throwing move it falls back to copying elements to keep its strong exception guarantee.', correct: true, why: 'Right. A move that might throw could leave the old buffer half-emptied with no way to roll back.' },
      { text: '`noexcept` makes the move constructor run faster by skipping destructor calls.', correct: false, why: '`noexcept` does not skip anything; it promises that no exception escapes.' },
      { text: 'Without `noexcept` the compiler refuses to generate the move constructor.', correct: false, why: 'A user-written move constructor compiles without it; you just lose the optimization.' },
      { text: '`noexcept` is required by the language for every special member function.', correct: false, why: 'It is optional. Destructors are implicitly `noexcept`, but moves are not unless declared.' },
    ],
    explanation: `When a \`std::vector\` reallocates it must keep the old elements valid if something throws. Copying is safe to abort; moving is not. So the library moves elements only if the move is \`noexcept\` (or the type cannot be copied). A copying "slow path" silently appears when you forget it.`,
  },
  {
    id: 'copy-move-q09', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What is `Connection(const Connection&) = delete;` for?',
    options: [
      { text: 'It makes copying a compile-time error, which is right for types with unique ownership such as sockets or file handles.', correct: true, why: 'Right. A deleted function takes part in overload resolution and then produces an error if selected.' },
      { text: 'It removes the copy constructor from the vtable.', correct: false, why: 'Constructors never appear in a vtable, and this has nothing to do with virtual dispatch.' },
      { text: 'It silently turns every copy into a move.', correct: false, why: 'Deleted copying does not fall back to moving; code that tries to copy simply fails to compile.' },
      { text: 'It frees the memory of the copied object.', correct: false, why: '`= delete` is a declaration for the compiler; it runs no code.' },
    ],
    explanation: `\`= delete\` documents and enforces "this operation is not allowed". Pair \`= delete\` on copy with a defaulted or custom move to get a **move-only** type (the shape of \`std::unique_ptr\`). It is also the modern replacement for declaring copy operations private and leaving them undefined.`,
  },
  {
    id: 'copy-move-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What does this print?',
    codeLang: 'python',
    code: `import copy
a = [[1, 2], [3]]
b = copy.copy(a)
a[0].append(99)
print(b[0])`,
    options: [
      { text: '`[1, 2, 99]`: `copy.copy` made a new outer list but the inner lists are shared.', correct: true, why: 'Right. A shallow copy copies references to the nested objects, not the objects.' },
      { text: '`[1, 2]`: `copy.copy` duplicated everything.', correct: false, why: 'That describes `copy.deepcopy`; `copy.copy` stops at the first level.' },
      { text: '`[99]`: the copy only keeps the last appended value.', correct: false, why: 'Nothing about copying discards elements; `b[0]` is the same list object as `a[0]`.' },
      { text: 'It raises `RuntimeError` because nested lists cannot be copied.', correct: false, why: 'Copying nested lists works fine; the question is only whether they are duplicated.' },
    ],
    explanation: `\`copy.copy(a)\`, \`a[:]\`, \`list(a)\` and \`a.copy()\` all produce a **shallow** copy: a new outer list whose items are the same objects as before. Mutating a shared inner list is visible through both outer lists. Use \`copy.deepcopy\` when the nested data must be independent.`,
  },
  {
    id: 'copy-move-q11', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'After `b = copy.deepcopy(a)` where `a = {"tags": ["x"]}`, you run `a["tags"].append("y")`. What is `b["tags"]`?',
    options: [
      { text: '`["x"]`: the deep copy duplicated the nested list, so the objects are independent.', correct: true, why: 'Right. `deepcopy` recursively copies the contents.' },
      { text: '`["x", "y"]`: deep copies are still linked to the original.', correct: false, why: 'A deep copy shares nothing mutable with its source.' },
      { text: '`["y"]`: the copy keeps only the most recent change.', correct: false, why: 'The copy does not track the original after the moment it was made.' },
      { text: 'It raises `KeyError`, since deep copies drop nested keys.', correct: false, why: 'Deep copies keep every key; they just duplicate the values.' },
    ],
    explanation: `\`copy.deepcopy\` walks the object graph and clones every mutable object it finds, using a \`memo\` dictionary so shared and cyclic references are cloned once. The result has no mutable state in common with the original, which is what you want for a snapshot.`,
  },
  {
    id: 'copy-move-q12', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `def add(x, log=[]):
    log.append(x)
    return log

add(1)
add(2)
print(add(3))`,
    options: [
      { text: '[1, 2, 3]', correct: true, why: 'The default list is created once when `def` runs, so every call that omits `log` appends to the same list.' },
      { text: '[3]', correct: false, why: 'This is what you would expect if the default were created per call, which Python does not do.' },
      { text: '[1, 2]', correct: false, why: 'The third call appends 3 to the same shared list before returning it.' },
      { text: '[]', correct: false, why: 'The function appends before returning, so the list is never empty.' },
    ],
    explanation: `Default argument values are evaluated **once**, at function definition time. A mutable default therefore becomes shared state across calls. The idiom is \`def add(x, log=None): if log is None: log = []\`, which creates a fresh list per call.`,
  },
  {
    id: 'copy-move-q13', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'What does `b = a` (or `T b = a;` in C++) mean in each language?',
    options: [
      { text: 'Python: `b` becomes another name for the same object, with no copy. C++: for class types a new object is created by the copy constructor.', correct: true, why: 'Right. Python variables are references; C++ variables of class type are objects.' },
      { text: 'Both languages create an independent copy of the object.', correct: false, why: 'Python never copies on assignment, so mutating through `b` changes `a`.' },
      { text: 'Both languages make `b` an alias of `a`.', correct: false, why: 'C++ only aliases with a reference (`T& b = a;`); `T b = a;` constructs a new object.' },
      { text: 'Python copies shallowly; C++ copies deeply.', correct: false, why: 'Python does not copy at all here, and C++ copies however your copy constructor says.' },
    ],
    explanation: `In Python every name refers to an object, and assignment rebinds a name. In C++ a variable of class type *is* the object, so initialization from another object constructs a new one. To alias in C++ you need a reference or pointer; to copy in Python you call \`copy.copy\`/\`deepcopy\` or a constructor.`,
  },
  {
    id: 'copy-move-q14', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'What is the Rule of Zero?',
    options: [
      { text: 'Write none of the destructor, copy and move functions: hold resources in members like `std::vector`, `std::string` or `std::unique_ptr` that already handle them.', correct: true, why: 'Right. Compiler-generated special members then do the correct thing automatically.' },
      { text: 'Classes should have zero data members.', correct: false, why: 'The rule is about special member functions, not about members.' },
      { text: 'Never define any constructors.', correct: false, why: 'Constructors are fine; the rule concerns destructor/copy/move.' },
      { text: 'All copies should have zero cost.', correct: false, why: 'Nothing in the rule promises cost; it is a design guideline about correctness and simplicity.' },
    ],
    explanation: `Resource handling belongs in a few small, well-tested classes (containers, smart pointers). Everything built from them can use the compiler-generated special members, which are then correct by construction. Reserve the Rule of Five for the rare class that really wraps a raw resource.`,
  },
  {
    id: 'copy-move-q15', lang: 'cpp', type: 'bug', difficulty: 3,
    prompt: 'What is wrong with this copy assignment operator?',
    codeLang: 'cpp',
    code: `Buffer& Buffer::operator=(const Buffer& o) {
    delete[] data_;
    data_ = new int[o.n_];
    n_ = o.n_;
    std::copy(o.data_, o.data_ + n_, data_);
    return *this;
}`,
    options: [
      { text: 'On self-assignment (`a = a;`) it frees the data it is about to copy from; it is also not exception safe if `new` throws.', correct: true, why: 'Right. `o.data_` is the same pointer that was just deleted, so the copy reads freed memory.' },
      { text: 'Assignment operators must return by value.', correct: false, why: 'The conventional return is `T&` so assignments can chain.' },
      { text: 'It must call the destructor explicitly before deleting.', correct: false, why: 'Explicit destructor calls are not needed; the object remains alive after assignment.' },
      { text: '`std::copy` cannot be used with raw pointers.', correct: false, why: '`std::copy` works with any input and output iterators, including pointers.' },
    ],
    explanation: `Always make assignment safe for \`a = a\` and for exceptions. Either check \`if (this == &o) return *this;\` and allocate the new block **before** deleting the old one, or use **copy-and-swap**: \`Buffer& operator=(Buffer o) noexcept { swap(*this, o); return *this; }\`. The by-value parameter performs the copy first, and the temporary frees the old state.`,
  },
];
