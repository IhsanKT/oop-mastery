export default [
  {
    id: 'why-oop-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'In object-oriented programming, what does an **object** bundle together?',
    options: [
      { text: 'Its **state** (data), the **behavior** that reads and changes that state (methods), and its own **identity**, distinct from every other object.', correct: true, why: 'Right. State + behavior + identity: two accounts with equal balances are still two separate accounts, each changed only through its own methods.' },
      { text: 'Only data. The functions live separately and receive the data as arguments.', correct: false, why: 'That is the procedural model (a struct plus free functions). In OOP the methods belong with the data, so the object itself can enforce its rules.' },
      { text: 'Only methods. The data lives in global variables that all the methods share.', correct: false, why: 'Global data shared by functions is exactly the procedural design OOP replaces. Each object carries its own state, so two objects never interfere.' },
      { text: 'A private copy of the class\'s source code, so each object can run independently.', correct: false, why: 'Method code exists once per class and is shared by all its objects. What each object owns is its *state*; the method simply runs on whichever object it is called on.' },
    ],
    explanation: `An object packages **state** (data such as a balance), **behavior** (methods that read and change *that* state) and **identity** (it is one specific thing, distinct from every other object, even one with equal state).

The method code is written once, in the class, and shared by all instances; each object owns only its state. Keeping the data together with the only code allowed to change it is what lets an object protect its own rules.`,
  },
  {
    id: 'why-oop-q02', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'A program defines a class `Account` and then creates two accounts, `a` and `b`, from it. Which statement is correct?',
    options: [
      { text: '`Account` is the class: the blueprint that defines what state and behavior every account has. `a` and `b` are two objects (instances) of it, each with its own state.', correct: true, why: 'One class, many objects. The class defines the shape once; every instance gets its own copy of the data members.' },
      { text: '`a` and `b` share one set of data members, because they were created from the same class.', correct: false, why: 'Each instance has its own state: depositing into `a` leaves `b` unchanged. Only class-level (`static` / class attribute) members are shared, a topic for Module 09.' },
      { text: '`Account` is itself an account with default values, and `a` and `b` are copies of it.', correct: false, why: 'A class is not an instance of itself. In C++ it is a compile-time type; in Python it is an object of type `type`, not an `Account`. Instances are created by calling a constructor.' },
      { text: 'A class can have only one object at a time, so creating `b` replaces `a`.', correct: false, why: 'You can create as many instances as you need; they coexist independently. Being limited to one instance is a special design (Singleton, Module 19), not how classes work.' },
    ],
    explanation: `A **class** is a type: it declares the state every instance has and defines the behavior once. An **object** (instance) is a value of that type. You can create as many as you like, and each has its own copy of the instance data (\`balance_\` in C++, \`self._balance\` in Python).

Methods are defined in the class and run on whichever object they are called on, so \`a.deposit(50)\` changes \`a\` and only \`a\`.`,
  },
  {
    id: 'why-oop-q03', lang: 'both', type: 'concept', difficulty: 1,
    prompt: '`Account` keeps `balance_` private, so outside code can change it only through `deposit()` and `withdraw()`, which reject invalid amounts. Which pillar of OOP is this?',
    codeLang: 'cpp',
    code: `class Account {
public:
    bool deposit(double amount);    // rejects amount <= 0
    bool withdraw(double amount);   // rejects overdrafts
    double balance() const;
private:
    double balance_ = 0.0;          // outside code cannot touch this
};`,
    options: [
      { text: 'Encapsulation', correct: true, why: 'Encapsulation bundles data with the methods that guard it and hides the data, so every change goes through code that enforces the rules.' },
      { text: 'Abstraction', correct: false, why: 'Abstraction is about choosing a simple *interface* (what an account can do). Making `balance_` unreachable from outside is the mechanism that protects that interface: encapsulation.' },
      { text: 'Inheritance', correct: false, why: 'Inheritance creates a new class from an existing one (is-a). Nothing here derives from anything; the point is restricting access to data.' },
      { text: 'Polymorphism', correct: false, why: 'Polymorphism means one call running different code for different types of object. There is only one type here, and the point is protecting its state.' },
    ],
    explanation: `**Encapsulation** combines two ideas: bundling data with the functions that operate on it, and restricting direct access to that data (information hiding). Because \`balance_\` is \`private\`, only \`Account\`'s own member functions can change it, so the rule "never negative" is enforced in exactly one place.

Python expresses the same intent with \`self._balance\`, a naming convention rather than an enforced rule. Module 04 covers the tools of both languages.`,
  },
  {
    id: 'why-oop-q04', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'Which sentence best describes **polymorphism**?',
    options: [
      { text: 'The same call, such as `shape.area()`, runs different code depending on the actual type of the object it is made on.', correct: true, why: 'One interface, many forms: a circle answers `area()` with its own formula and a square with another, while the calling code stays the same.' },
      { text: 'A class can receive the data and methods of a parent class.', correct: false, why: 'That is inheritance. In C++ it is the usual way to set up polymorphism, but it is not the same thing, and Python gets polymorphism even without a shared base class (duck typing).' },
      { text: 'An object hides its data so outside code can only use its methods.', correct: false, why: 'That is encapsulation. It controls *access* to state; polymorphism is about *which code runs* for a given call.' },
      { text: 'Many objects can be created from the same class.', correct: false, why: 'That is just instantiation. Objects of one class all run the same method code; polymorphism is about different types answering the same call differently.' },
    ],
    explanation: `*Polymorphism* ("many forms") lets one piece of code work with objects of different types through a common interface: \`total += s.area()\` runs the circle's formula for a circle and the square's for a square, and keeps working for shapes written later.

Python dispatches every method call on the object's actual class, so even unrelated classes that all have an \`area()\` method work (duck typing). C++ needs \`virtual\` functions called through a reference or pointer (Module 06). Overloading and templates are other, compile-time forms of polymorphism.`,
  },
  {
    id: 'why-oop-q05', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `a = [1, 2, 3]
b = a
b.append(4)
print(a)
b = b + [5]
print(a)
print(b)`,
    options: [
      { text: '[1, 2, 3, 4]\n[1, 2, 3, 4]\n[1, 2, 3, 4, 5]', correct: true, why: '`b = a` makes `b` a second name for the same list, so `append` is visible through `a`. `b + [5]` builds a *new* list and rebinds only `b`.' },
      { text: '[1, 2, 3]\n[1, 2, 3]\n[1, 2, 3, 4, 5]', correct: false, why: 'Assignment never copies in Python: `b = a` binds another name to the existing list. Only an explicit copy (`a.copy()`, `list(a)`, `a[:]`) creates a new list.' },
      { text: '[1, 2, 3, 4]\n[1, 2, 3, 4, 5]\n[1, 2, 3, 4, 5]', correct: false, why: '`b + [5]` does not modify any list: `+` returns a brand-new list, which is then bound to `b`. (`b += [5]` *would* have mutated the shared list in place.)' },
    ],
    explanation: `In Python a variable is a name bound to an object, and assignment binds names; it never copies. After \`b = a\` there is one list with two names, so \`b.append(4)\` mutates the list that \`a\` also names.

\`b = b + [5]\` is different: \`+\` creates a new list, and the assignment rebinds \`b\` to it, leaving \`a\` alone. Rule of thumb: **mutating** an object is seen through every name; **rebinding** a name affects only that name.`,
  },
  {
    id: 'why-oop-q06', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Point {
    int x;
    int y;
};

int main() {
    Point a{1, 2};
    Point b = a;    // (1)
    Point& c = a;   // (2)
    b.x = 9;
    c.y = 7;
    std::cout << a.x << " " << a.y << " " << b.x << "\\n";
}`,
    options: [
      { text: '1 7 9', correct: true, why: 'Line (1) copies, so `b.x = 9` changes only the copy. Line (2) makes `c` another name for `a`, so `c.y = 7` changes `a` itself.' },
      { text: '9 7 9', correct: false, why: 'That is Python\'s rule, not C++\'s. `Point b = a;` creates a second, independent `Point`; only a reference (`&`) or a pointer shares the original.' },
      { text: '1 2 9', correct: false, why: 'A reference is not a copy: `Point& c = a;` creates no new object, so writing `c.y` writes `a.y`.' },
      { text: '9 2 9', correct: false, why: 'This swaps the two rules: the plain declaration (1) is the copy, and the `&` declaration (2) is the alias.' },
    ],
    explanation: `C++ objects have **value semantics**: a variable of class type holds the object itself, and initializing one object from another copies every member (here through the implicitly generated copy constructor). A **reference** declares a new name for an existing object and copies nothing.

So the program has exactly two \`Point\`s: \`a\` (also reachable as \`c\`) and \`b\`. In Python, *every* assignment behaves like line (2).`,
  },
  {
    id: 'why-oop-q07', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `a = [1, 2]
b = [1, 2]
c = a
print(a == b, a is b)
print(a == c, a is c)`,
    options: [
      { text: 'True False\nTrue True', correct: true, why: '`a` and `b` are two different list objects with equal contents; `c` is just another name for the object `a` names.' },
      { text: 'True True\nTrue True', correct: false, why: 'Two list displays create two separate objects, even with the same contents. `is` asks whether both names refer to one object, and here they do not.' },
      { text: 'False False\nTrue True', correct: false, why: '`==` on lists compares the contents element by element (`list.__eq__`); it is not an identity check.' },
      { text: 'True False\nTrue False', correct: false, why: '`c = a` does not copy the list; it binds `c` to the very same object, so `a is c` is `True`.' },
    ],
    explanation: `\`==\` asks *do these have equal values?* and calls \`__eq__\`; for lists, that compares the elements. \`is\` asks *are these the same object?* (in CPython, the same address, as shown by \`id()\`).

Equal-but-separate objects give \`True\` for \`==\` and \`False\` for \`is\`; two names for one object give \`True\` for both. Use \`==\` for values and keep \`is\` for identity checks such as \`x is None\`.`,
  },
  {
    id: 'why-oop-q08', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'Inside a function, C++ executes `Point p;` and Python executes `p = Point()`. Which comparison is accurate?',
    options: [
      { text: 'In C++, `p` **is** the `Point`: it is created right there, in the function\'s automatic storage, and destroyed when the scope ends. In Python, `Point()` creates an object on the heap and `p` is only a name bound to it; the object lives as long as something refers to it.', correct: true, why: 'C++ variables of class type are objects; Python variables are references. That one difference explains copying, aliasing and lifetime in both languages.' },
      { text: 'Both create the object on the heap and store a reference to it in `p`; C++ just hides the pointer.', correct: false, why: 'C++ uses dynamic storage only when you ask for it (`new`, `std::make_unique`). `Point p;` puts the object itself in automatic storage; there is no hidden pointer.' },
      { text: 'In C++, `Point p;` only declares a name; the object is created later, when `p` is first assigned.', correct: false, why: 'A C++ definition creates the object immediately and runs its default constructor. (If `Point` is a plain struct without initializers, its members hold indeterminate values until set, but the object exists.)' },
      { text: 'Both objects are destroyed exactly when the function returns.', correct: false, why: 'True for the C++ local, not for Python: if the function returns `p` or stores it somewhere, the object keeps living. It is freed only when no references to it remain.' },
      { text: 'In Python, `p` holds the object\'s attributes directly, so `q = p` copies them, as in C++.', correct: false, why: 'A Python variable never contains an object, only a reference to one. `q = p` copies the reference: afterwards both names refer to the same object.' },
    ],
    explanation: `C++ variables of class type **are** objects: \`Point p;\` reserves space for a \`Point\` in the function's automatic storage (in practice, the stack), runs the default constructor, and runs the destructor when the scope ends.

Python variables are **names**: \`Point()\` creates the object on the heap, and the assignment binds \`p\` to it. The object's lifetime is not tied to the name; CPython frees it when its reference count reaches zero, which may be long after the function returns.`,
  },
  {
    id: 'why-oop-q09', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What do `a == b` and `a is b` evaluate to here, and why?',
    codeLang: 'python',
    code: `class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance


a = Account("Ada", 100)
b = Account("Ada", 100)`,
    options: [
      { text: 'Both are `False`: `Account` defines no `__eq__`, so `==` falls back to comparing identity, and `a` and `b` are two different objects.', correct: true, why: 'Equal attributes do not make objects equal unless the class says so. The inherited `object.__eq__` only considers an object equal to itself.' },
      { text: '`a == b` is `True` and `a is b` is `False`: `==` compares the attributes of the two objects.', correct: false, why: 'Python never compares attributes automatically. You must define `__eq__` (or use `@dataclass`, which writes it for you) to get value equality.' },
      { text: 'Both are `True`: Python reuses the existing object when the constructor arguments are equal.', correct: false, why: 'Every call to `Account(...)` creates a new object. CPython caches only a few immutable built-in values (such as small integers), never instances of your classes.' },
      { text: '`a == b` raises `TypeError`, because `Account` does not define `__eq__`.', correct: false, why: 'Every class inherits a default `__eq__` from `object`, so `==` always works; by default it simply means "is the same object".' },
    ],
    explanation: `**Identity** asks "is this the same object?" (\`is\`, \`id()\`). **Equality** asks "do these have the same value?", and *the class decides* what that means by defining \`__eq__\`. Without one, Python falls back to identity, so two separately created accounts are never equal.

C++ makes the opposite choice: \`a == b\` does not even compile for a class without an \`operator==\` (C++20 can generate one with \`bool operator==(const Account&) const = default;\`), while identity is \`&a == &b\`.`,
  },
  {
    id: 'why-oop-q10', lang: 'python', type: 'bug', difficulty: 2,
    prompt: '`with_fee` must return the amounts plus a fee **without changing its input**, but `today` changes. What is the bug, and what is the best fix?',
    codeLang: 'python',
    code: `def with_fee(amounts):
    amounts.append(2.50)
    return amounts


today = [10.0, 20.0]
bill = with_fee(today)
print(today)   # expected [10.0, 20.0], got [10.0, 20.0, 2.5]`,
    options: [
      { text: '`amounts` is another name for the caller\'s list, so `append` mutates `today`. Build a new list instead: `return amounts + [2.50]`.', correct: true, why: 'Arguments are passed by sharing: the parameter refers to the caller\'s object. Creating a new list leaves the caller\'s data untouched.' },
      { text: 'Start the function with `amounts = amounts` to make a local copy, then append.', correct: false, why: 'Assignment never copies in Python; it only binds another name to the same list. A copy needs `list(amounts)`, `amounts.copy()` or `amounts[:]`.' },
      { text: 'Python passed a copy, but `return amounts` copied the changed list back into `today`. Remove the `return`.', correct: false, why: 'Nothing is copied, neither on the call nor on return: `today` itself was mutated by `append`, and `bill is today` is `True`.' },
      { text: 'Add `del amounts` at the end of the function so the change is discarded.', correct: false, why: '`del` removes a *name*, not the object. The list is still referenced by `today`, and it keeps the appended value.' },
    ],
    explanation: `Python passes arguments by **sharing**: the parameter becomes another name for the caller's object. So \`amounts.append(...)\` mutates \`today\` itself, and \`bill\` is that same list.

If a function is not supposed to change its input, build a new object:

~~~python
def with_fee(amounts):
    return amounts + [2.50]     # new list; the caller's list is untouched
~~~

C++ has the opposite default: a \`std::vector<double>\` parameter taken by value is a copy, and you must write \`&\` to share the caller's vector.`,
  },
  {
    id: 'why-oop-q11', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'The bank\'s rule is "a balance never goes negative". `withdraw` checks it, yet negative balances keep appearing. What is the underlying **design** problem?',
    codeLang: 'python',
    code: `balances = {"ada": 100.0, "grace": 50.0}

def withdraw(name, amount):
    if 0 < amount <= balances[name]:
        balances[name] -= amount
        return True
    return False

def charge_monthly_fee(name):
    balances[name] -= 5.0

def transfer(src, dst, amount):
    balances[src] -= amount
    balances[dst] += amount`,
    options: [
      { text: 'The rule has no owner: the data is open to every function, so each one must remember to re-check it, and `charge_monthly_fee` and `transfer` forget. An `Account` object that owns its balance and only changes it through checked methods enforces the rule in one place.', correct: true, why: 'This is the scattered-invariant problem. Encapsulation turns "every function must remember" into "no function can bypass it".' },
      { text: 'Only `transfer` is wrong; make it call `withdraw` and the problem is solved for good.', correct: false, why: 'That fixes one symptom. `charge_monthly_fee` still breaks the rule, and the next function someone writes can write `balances[...]` directly again.' },
      { text: 'Using `float` for money; integer cents would prevent negative balances.', correct: false, why: 'Integer cents avoid rounding errors, which is good practice, but they say nothing about *who* enforces the rule. `-500` cents is still negative.' },
      { text: 'A dict is the wrong container; parallel lists indexed by position would make the check automatic.', correct: false, why: 'The container is irrelevant. Parallel lists are even worse (they can drift apart), and no container stops other functions from writing to it.' },
    ],
    explanation: `An **invariant** is a rule that must always hold for some data, like "balance ≥ 0". In procedural code the data is open to every function, so the invariant has no owner: each function must re-implement the check, and one that forgets breaks it silently, with the symptom appearing far from the cause.

Bundling the balance with the only methods allowed to change it (and making it private) means the check is written once and cannot be bypassed. That is the core motivation for objects.`,
  },
  {
    id: 'why-oop-q12', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

struct Noisy {
    std::string name;
    explicit Noisy(std::string n) : name(n) { std::cout << "+" << name << " "; }
    ~Noisy() { std::cout << "-" << name << " "; }
};

void f() {
    Noisy b("b");
    std::cout << "f ";
}

int main() {
    Noisy a("a");
    f();
    {
        Noisy c("c");
        Noisy d("d");
    }
    Noisy e("e");
    std::cout << "end ";
}`,
    options: [
      { text: '+a +b f -b +c +d -d -c +e end -e -a', correct: true, why: 'Each local dies at the closing brace of its own scope, and objects in the same scope die in reverse order of construction.' },
      { text: '+a +b f +c +d +e end -e -d -c -b -a', correct: false, why: 'C++ has no garbage collector that waits until the end of the program: `b` dies when `f` returns, and `c` and `d` die at the end of the inner block.' },
      { text: '+a +b -b f +c +d -d -c +e end -e -a', correct: false, why: 'An object is not destroyed after its last use. An automatic object lives until the end of its scope, so `b` is still alive while `f` prints `f`.' },
      { text: '+a +b f -b +c +d -c -d +e end -a -e', correct: false, why: 'Destruction is last-in, first-out: `d` was built after `c` (and might depend on it), so `d` is destroyed first.' },
    ],
    explanation: `An automatic (local) object's lifetime ends at the closing \`}\` of the block that declared it, and its destructor runs right there. This is deterministic, not left to a garbage collector. Within one scope, objects are destroyed in **reverse order of construction**, like a stack of plates.

That is why \`b\` dies as \`f\` returns, \`d\` dies before \`c\`, and \`e\` dies before \`a\`. C++ builds RAII (Module 11) on this guarantee: a destructor that closes a file or releases a lock runs at a precisely known point.`,
  },
  {
    id: 'why-oop-q13', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'A teammate says "abstraction and encapsulation are the same thing". Which statement best distinguishes them?',
    options: [
      { text: 'Abstraction is about the **outside**: choosing an interface that shows what an object does (`withdraw(amount)`) and leaves out how. Encapsulation is about the **inside**: bundling the data with its methods and restricting access, so the implementation can only be reached through that interface.', correct: true, why: 'Abstraction is the design decision (what to expose); encapsulation is the mechanism that keeps everything else out of reach. They support each other but are different ideas.' },
      { text: 'Abstraction means abstract classes and pure virtual functions; encapsulation covers everything else about classes.', correct: false, why: 'Abstract classes are one *tool* for abstraction. A concrete class with a small, clean interface (like `std::string`) is also an abstraction.' },
      { text: 'They are the same idea under different names: "encapsulation" is the C++ term and "abstraction" the Python term.', correct: false, why: 'Both ideas exist in both languages. You can have a clean abstraction that is poorly encapsulated, such as an interface whose internals are still public.' },
      { text: 'Abstraction hides data, while encapsulation hides algorithms.', correct: false, why: 'The split is not data vs algorithms. Both can involve either; the difference is *what to show* (abstraction) vs *how the rest is kept hidden* (encapsulation).' },
    ],
    explanation: `**Abstraction** simplifies: it models only what matters to the user of an object, as an interface such as \`push_back\`, \`size\` and indexing for \`std::vector\`. **Encapsulation** protects: the vector's internal buffer pointer and bookkeeping are private, so no caller can put it into an inconsistent state.

A useful test: if you can change the implementation without changing any caller, the abstraction is good *and* the encapsulation holds. Python leans on convention (\`_name\`) for encapsulation, but abstraction works the same in both languages.`,
  },
  {
    id: 'why-oop-q14', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'C++ runs `std::vector<Point> v(3, Point{0, 0}); v[0].x = 5;` and Python runs `v = [Point(0, 0)] * 3; v[0].x = 5`. What is true afterwards?',
    options: [
      { text: 'C++: the vector holds three separate `Point` objects side by side in a heap buffer it owns, so only `v[0].x` is 5. Python: the list holds three references to **one** `Point`, so `v[1].x` and `v[2].x` are 5 too.', correct: true, why: 'C++ containers store objects by value; Python containers store references, and `* 3` repeats the reference without creating new objects.' },
      { text: 'Both hold three independent `Point`s, so only `v[0].x` changes in either language.', correct: false, why: '`* 3` repeats the *references* in the list; it never calls `Point(...)` again. Python created one object, and all three slots refer to it.' },
      { text: 'Both hold three references to one shared `Point`, so all three change in either language.', correct: false, why: 'A `std::vector<Point>` stores `Point` objects, not references: `v(3, Point{0, 0})` copies the prototype into three distinct elements.' },
      { text: 'C++: the three `Point`s live on the stack, because `v` is a local variable. Python: the `Point`s live inside the list object.', correct: false, why: 'The `std::vector` object itself is local, but it keeps its elements in a dynamically allocated buffer. A Python list stores only references; the `Point` lives elsewhere on the heap.' },
    ],
    explanation: `A \`std::vector<Point>\` stores \`Point\` **objects** by value, in a contiguous buffer that it allocates on the heap and frees in its destructor. Each element is a separate \`Point\` copied from the prototype, so modifying one leaves the others alone.

A Python list stores **references**, and \`[x] * 3\` repeats the reference three times without creating new objects. To get three separate Python objects, call the constructor three times:

~~~python
v = [Point(0, 0) for _ in range(3)]
~~~`,
  },
  {
    id: 'why-oop-q15', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'A teammate proposes four classes. Which is the **weakest** use of OOP, better written as a plain function?',
    options: [
      { text: '`PriceCalculator`: no data members, and one method `total(items, tax_rate)` that computes a result from its arguments.', correct: true, why: 'No state, no invariant, no identity: it is a function wearing a class costume. `total(items, tax_rate)` says the same with less ceremony.' },
      { text: '`Inventory`: keeps item counts and must never let a count drop below zero.', correct: false, why: 'State plus an invariant is the classic case for encapsulation: only the class\'s own methods can change the counts, so the rule is enforced in one place.' },
      { text: '`Money`: holds an amount in cents and a currency code, and adding two different currencies must be rejected.', correct: false, why: 'It looks like "just data", but it has a rule (no mixing currencies). A small value class that enforces it prevents a whole category of bugs.' },
      { text: '`RateLimiter`: remembers recent request times and answers `allow()` for each new request.', correct: false, why: 'The answer depends on remembered state that changes with every call. Bundling that state with `allow()` is exactly what objects are for.' },
    ],
    explanation: `Classes earn their keep when there is **state that must stay valid** (an invariant), **identity over time** (something that changes and must be remembered), or **several interchangeable implementations** behind one interface. A stateless computation has none of these: \`PriceCalculator().total(items, rate)\` is just \`total(items, rate)\` with extra steps.

C++ and Python are both multi-paradigm, so free functions are first-class tools. Keep classes for the places where they protect something.`,
  },
  {
    id: 'why-oop-q16', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print? Watch how each function takes its `Account` parameter.',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Account {
    int balance = 0;
};

void depositByValue(Account acc, int amount) { acc.balance += amount; }
void depositByRef(Account& acc, int amount) { acc.balance += amount; }
Account depositCopy(Account acc, int amount) {
    acc.balance += amount;
    return acc;
}

int main() {
    Account a;
    depositByValue(a, 10);
    std::cout << a.balance << " ";
    depositByRef(a, 20);
    std::cout << a.balance << " ";
    Account b = depositCopy(a, 5);
    std::cout << a.balance << " " << b.balance << "\\n";
}`,
    options: [
      { text: '0 20 20 25', correct: true, why: 'The by-value call changes a copy that is thrown away; the by-reference call changes `a`; `depositCopy` changes and returns a copy, which becomes `b`.' },
      { text: '10 30 35 35', correct: false, why: 'That is how Python would behave, sharing the caller\'s object every time. In C++, a parameter without `&` is a new object copied from the argument.' },
      { text: '0 20 25 25', correct: false, why: 'Returning the modified copy does not write it back into `a`. The returned object initializes `b`, and `a` is untouched.' },
      { text: '0 0 0 5', correct: false, why: 'The `&` matters: `Account& acc` is another name for the caller\'s `a`, so `depositByRef` really changes `a` to 20.' },
    ],
    explanation: `A by-value parameter is a **new object** initialized as a copy of the argument; changes to it vanish when the function returns. A reference parameter (\`Account&\`) is another name for the caller's object, so changes are visible to the caller. Returning by value hands back the modified *copy*, which initializes \`b\`.

To read a large object without copying it, take \`const Account&\`. In Python, all three functions would receive the caller's object itself, so every change would show up in \`a\`.`,
  },
];
