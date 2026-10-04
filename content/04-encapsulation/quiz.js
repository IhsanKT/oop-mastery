export default [
  {
    id: 'encapsulation-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'In object-oriented design, what is a class **invariant**?',
    options: [
      { text: 'A condition that is true for every object of the class whenever outside code can observe it: after the constructor finishes, and before and after every public operation (for example, "the balance is never negative").', correct: true, why: 'Right. The constructor establishes it and every public member function preserves it. Inside a member function it may be briefly broken, as long as it is restored before the function returns.' },
      { text: 'A data member whose value never changes after construction, such as a `const` member.', correct: false, why: 'That describes a constant, not an invariant. An invariant is a *rule about* the state ("balance ≥ 0"); the state may change freely as long as the rule keeps holding.' },
      { text: 'Any data member declared `private` (or named with a leading underscore in Python).', correct: false, why: 'Privacy is a *tool* for protecting invariants, not the invariant itself. A private member with no rule attached protects nothing in particular.' },
      { text: 'An `assert` statement that checks a condition in debug builds only.', correct: false, why: 'An assertion can *check* an invariant, but the invariant is a property of the design. It must hold in release builds too, whether or not anything checks it.' },
    ],
    explanation: `An invariant is a promise a class makes about every one of its objects, such as "the balance is never negative" or "the items stay sorted". Encapsulation exists to keep that promise: the constructor establishes the invariant, and the only code that can change the data is the class's own member functions, each of which must leave the invariant true.

If the data were public, any line in the program could break the rule, and finding the culprit would mean searching the whole program. With encapsulation, a broken invariant is always a bug inside one class.`,
  },
  {
    id: 'encapsulation-q02', lang: 'cpp', type: 'concept', difficulty: 1,
    prompt: 'Which of the lines (A), (B) and (C) fail to compile?',
    codeLang: 'cpp',
    code: `class Point {
    int x = 0;
public:
    int y = 0;
};

struct Pair {
    int a = 0;
};

int main() {
    Point p;
    Pair q;
    p.x = 1;   // (A)
    p.y = 2;   // (B)
    q.a = 3;   // (C)
}`,
    options: [
      { text: 'Only (A): members of a `class` are private until an access specifier says otherwise.', correct: true, why: 'Before the first `public:`, everything in a `class` is private, so `main` cannot use `x`. `y` comes after `public:`, and `struct` members are public by default.' },
      { text: 'Only (C): `struct` members are private by default, just like in a `class`.', correct: false, why: 'It is the other way round: `struct` defaults to public. That is why plain bundles of data are usually written as structs.' },
      { text: '(A) and (C): data members are always private unless marked `public`.', correct: false, why: 'The default depends on the keyword: a `class` starts private, a `struct` starts public. `q.a` is public.' },
      { text: 'None of them: a member with an initializer, such as `int x = 0;`, is public.', correct: false, why: 'A default member initializer only gives the member its starting value. Access is decided by the class keyword and the access specifiers alone.' },
    ],
    explanation: `In C++, \`class\` and \`struct\` differ only in their defaults: members of a \`class\` are **private** until an access specifier appears, members of a \`struct\` are **public**, and the same goes for the default inheritance mode. GCC rejects line (A) with *'int Point::x' is private within this context*.

A common convention: use \`struct\` for passive bundles of data with no invariant, and \`class\` with explicit \`public:\` and \`private:\` sections for types that protect one.`,
  },
  {
    id: 'encapsulation-q03', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: "`main` fails to compile with `error: 'double Account::balance_' is private within this context`. What is the best fix?",
    codeLang: 'cpp',
    code: `#include <stdexcept>

class Account {
public:
    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("amount must be positive");
        balance_ += amount;
    }
    double balance() const { return balance_; }
private:
    double balance_ = 0;
};

int main() {
    Account a;
    a.balance_ += 100;   // error reported here
}`,
    options: [
      { text: 'Use the public interface: `a.deposit(100);`', correct: true, why: 'The error is encapsulation working as designed. `deposit` is the one place that knows the rules for changing the balance, so outside code goes through it.' },
      { text: 'Move `balance_` into the `public:` section.', correct: false, why: 'It compiles, but it deletes the protection: any code could then write `a.balance_ = -1e9;`, and the deposit rule would mean nothing.' },
      { text: 'Add `void setBalance(double b) { balance_ = b; }` and call `a.setBalance(a.balance() + 100);`', correct: false, why: 'An unchecked setter is a public field with extra steps. Callers can still store any value, and the "positive amounts only" rule is bypassed.' },
      { text: 'Declare `friend int main();` inside `Account`.', correct: false, why: "Friendship is for functions that are part of the class's interface. Befriending `main` just opens a backdoor to every private member." },
    ],
    explanation: `An access error from outside a class usually means you are trying to bypass the interface, not that the class is broken. \`private\` exists so that the only code able to change \`balance_\` is \`Account\`'s own member functions, which enforce its rules.

The fix is to say *what you want* through an operation (\`deposit\`) instead of editing the data. If no suitable operation exists, add one that keeps the invariant; do not expose the field.`,
  },
  {
    id: 'encapsulation-q04', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Does `richerThan` compile? It reads `other.balance_`, a private member of a *different* object.',
    codeLang: 'cpp',
    code: `class Account {
public:
    explicit Account(double b) : balance_(b) {}
    bool richerThan(const Account& other) const {
        return balance_ > other.balance_;
    }
private:
    double balance_;
};`,
    options: [
      { text: 'Yes: access control is per class, so any member function of `Account` may use the private members of any `Account` object.', correct: true, why: 'C++ asks *which code* is accessing the member, not *whose* object it is. `richerThan` is `Account` code, so `other.balance_` is fine.' },
      { text: 'No: `other.balance_` is private to `other`, so it must be read through a public getter.', correct: false, why: "Privacy is not per object. The class's own code is trusted with every object of that class; otherwise a copy constructor could not copy private members." },
      { text: 'Only when `other` refers to the same object as `*this`.', correct: false, why: 'Access is checked at compile time, from the code alone. The compiler cannot know which object `other` will refer to, and it does not need to.' },
      { text: 'Only because `other` is a `const` reference; through a non-const reference it would fail.', correct: false, why: '`const` controls whether you may *modify* the object, not whether you may *access* its members. Access rules ignore `const` entirely.' },
    ],
    explanation: `C++ access control is checked at compile time, based on **where the code is written**: inside a member function (or friend) of \`Account\`, every private member of every \`Account\` is accessible. Copy constructors and comparison operators rely on exactly this:

~~~cpp
Account(const Account& other) : balance_(other.balance_) {}
~~~

The class, not the object, is the unit of trust: one author writes all of \`Account\`'s code and is responsible for every \`Account\`'s invariant. Python follows the same convention: reading \`other._balance\` inside the class is considered fine.`,
  },
  {
    id: 'encapsulation-q05', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does the `friend` declaration in this class do?',
    codeLang: 'cpp',
    code: `#include <ostream>

class Fraction {
public:
    Fraction(int n, int d) : num_(n), den_(d) {}
    friend std::ostream& operator<<(std::ostream& os, const Fraction& f);
private:
    int num_, den_;
};`,
    options: [
      { text: '`Fraction` grants that one non-member function access to its private and protected members; `operator<<` stays a free function.', correct: true, why: 'A friend declaration is a grant made *by the class*. It lets this operator read `num_` and `den_` even though it is not a member function.' },
      { text: 'It makes `operator<<` a member function of `Fraction`.', correct: false, why: 'Friends are not members: they have no `this` and are not called on an object. That is precisely why `operator<<`, whose left operand is the stream, is written as a friend.' },
      { text: 'It lets `Fraction` access the private members of `std::ostream`.', correct: false, why: 'Friendship flows the other way: the class that *declares* the friend opens up its own members. `Fraction` gains no access to `std::ostream`.' },
      { text: 'It gives every function that takes a `Fraction` parameter access to its private members.', correct: false, why: 'Only the exact function declared (this `operator<<` overload) becomes a friend. Friendship is granted name by name, never to a whole category of code.' },
    ],
    explanation: `\`friend\` lets a class grant access to its private and protected members to one specific function or class. Friendship is **granted, never taken** (you cannot declare yourself a friend of someone else's class), and it is **not inherited, not transitive and not mutual**.

It is legitimate when the friend is logically part of the class's interface, as \`operator<<\` is: its left operand is the stream, so it cannot be a member, yet it must print private state. Because it is declared inside the class, it stays on the short list of code responsible for the invariants. Module 13 shows the "hidden friend" idiom.`,
  },
  {
    id: 'encapsulation-q06', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Which of the lines (A) and (B) compile?',
    codeLang: 'cpp',
    code: `class Account {
protected:
    double balance_ = 100;
};

class Savings : public Account {
public:
    void addInterest(double rate) {
        balance_ += balance_ * rate;   // (A)
    }
};

int main() {
    Savings s;
    s.addInterest(0.05);
    s.balance_ = 0;                    // (B)
}`,
    options: [
      { text: 'Only (A): `protected` members are available to the class, its friends and its derived classes, but not to outside code such as `main`.', correct: true, why: '`Savings` derives from `Account`, so its member functions may use `balance_` of its own objects. `main` is outside the hierarchy.' },
      { text: 'Both: through a `Savings` object, protected members behave like public ones.', correct: false, why: "Protected members are never available to outside code, whatever the object's type. GCC rejects (B) with 'double Account::balance_' is protected within this context." },
      { text: 'Neither: `protected` means private to `Account` itself.', correct: false, why: 'That describes `private`. The whole point of `protected` is to open a member to derived classes while keeping it closed to everyone else.' },
      { text: 'Only (B): `main` created the object, so it may access all of its members.', correct: false, why: 'Creating an object grants no access rights. Access depends on where the code is written, and `main` is part of neither `Account` nor `Savings`.' },
    ],
    explanation: `\`protected\` sits between \`public\` and \`private\`: the class, its friends **and its derived classes** may use the member, while outside code may not. Module 05 covers the details, including the rule that a derived class may use a protected member only through objects of its own type.

Use it sparingly for data. A protected data member is part of the contract with *every* future subclass, and each one can break the invariant (here, \`Savings\` could make the balance negative). A common design keeps the data \`private\` and gives subclasses \`protected\` member functions that enforce the rules.`,
  },
  {
    id: 'encapsulation-q07', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'This snippet appears in several places in a shop application. Which refactoring best follows **"tell, don\'t ask"**?',
    codeLang: 'cpp',
    code: `if (account.getBalance() >= price) {
    account.setBalance(account.getBalance() - price);
    order.markPaid();
}`,
    options: [
      { text: 'Give `Account` an operation such as `bool tryWithdraw(double amount)` that checks and updates in one place, and call it: `if (account.tryWithdraw(price)) order.markPaid();`', correct: true, why: 'The "no overdraft" rule moves into the object that owns the data. Callers say what they want; they no longer make the decision on behalf of `Account`.' },
      { text: 'Make the balance a public data member, since the getter and setter add nothing.', correct: false, why: 'That removes the boilerplate but keeps the real problem: the overdraft rule is still copied into every caller, and now nothing can ever enforce it.' },
      { text: 'Add `bool canAfford(double price) const` and keep calling `setBalance` after it.', correct: false, why: 'That is still *asking*: the caller checks, then performs the update itself. Any caller can skip the check and pass any value to `setBalance`.' },
      { text: 'Keep the code, and add a comment reminding developers to always check the balance first.', correct: false, why: 'A comment cannot enforce an invariant. The next caller who forgets the check creates an overdraft, and the bug could be anywhere in the program.' },
    ],
    explanation: `"Tell, don't ask" means: instead of pulling data out of an object, deciding something, and pushing the result back in, **tell the object what you want** and let it apply its own rules. The getter/setter version spreads the overdraft rule over every call site; an operation keeps it in exactly one place, next to the data it protects. In Python the same advice applies: \`account.withdraw(price)\`, not \`account.balance -= price\`.

A getter and a setter for every field is a sign of a data bag in disguise. Design classes around their **operations** (\`withdraw\`, \`deposit\`, \`transferTo\`) and add getters only for what callers genuinely need to read.`,
  },
  {
    id: 'encapsulation-q08', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class A:
    def __init__(self):
        self.__secret = 42
        self._hint = 7


a = A()
print(sorted(vars(a)))
print(hasattr(a, '__secret'), a._A__secret)`,
    options: [
      { text: "['_A__secret', '_hint']\nFalse 42", correct: true, why: "Inside the class body, `self.__secret` is compiled as `self._A__secret`. The string `'__secret'` is not mangled, so `hasattr` looks for a name that does not exist, while the mangled name works." },
      { text: "['__secret', '_hint']\nTrue 42", correct: false, why: 'The attribute is stored only under its mangled name, `_A__secret`; no attribute called `__secret` exists. Mangling renames; it does not create an alias.' },
      { text: "['_hint']\nFalse 42", correct: false, why: 'Name mangling does not hide anything: `vars(a)` shows the whole instance `__dict__`, including `_A__secret`.' },
      { text: "['_A__secret', '_hint']\nTrue 42", correct: false, why: "Mangling applies to *identifiers* in the class body at compile time, never to strings. `hasattr(a, '__secret')` searches for the literal name `__secret`, which is absent." },
    ],
    explanation: `Any identifier of the form \`__name\` (two leading underscores, at most one trailing) written inside a class body is rewritten by the compiler to \`_ClassName__name\`. So \`self.__secret = 42\` creates the attribute \`_A__secret\`, which \`vars\` lists and anyone can read as \`a._A__secret\`. Strings passed to \`hasattr\`, \`getattr\` or \`setattr\` are not rewritten, and code outside the class that writes \`a.__secret\` gets an \`AttributeError\`.

The purpose is to avoid *accidental* clashes with subclass attributes, not to provide privacy. For "internal, please don't touch", the convention is a single underscore, as in \`_hint\`.`,
  },
  {
    id: 'encapsulation-q09', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How does a C++ `private` member compare with a Python attribute named `__balance` (two leading underscores) in class `Account`?',
    options: [
      { text: 'C++ `private` is checked by the compiler: outside code that names the member does not compile. Python merely renames `__balance` to `_Account__balance`, and outside code can still use that name. Neither is a security mechanism.', correct: true, why: 'Right. One is an enforced access rule, the other a rename that avoids clashes with subclass attributes. Both guard against mistakes, not against determined code.' },
      { text: 'They are equivalent: Python raises an error whenever code outside the class touches `__balance`.', correct: false, why: '`acct.__balance` from outside fails only because no attribute has that exact name; `acct._Account__balance` works fine. Nothing checks *who* is accessing.' },
      { text: "Python's version is stronger: the attribute is encrypted, while a C++ private member can be reached through pointer tricks.", correct: false, why: 'Nothing is encrypted: the value sits in the instance `__dict__` under a predictable name. Mangling is a compile-time rename and nothing more.' },
      { text: 'C++ `private` members cannot be used by derived classes, while Python `__balance` works like `protected`: shared with subclasses, hidden from outsiders.', correct: false, why: 'The C++ half is right, but mangling makes `__balance` *harder* for subclasses: inside a subclass, `self.__balance` becomes `_Sub__balance`, a different attribute. Outsiders can still use `_Account__balance`.' },
    ],
    explanation: `C++ access control is an **enforced compile-time rule**: naming a private member outside the class (and its friends) is an error. It prevents mistakes rather than attacks; the bytes are in memory like any others.

Python has **no access control at all**. Double-underscore names are mangled to \`_ClassName__name\` so that a base class's internal attribute cannot be clobbered by a subclass that happens to pick the same name. Idiomatic Python marks internals with a single underscore and trusts its callers ("we are all consenting adults").`,
  },
  {
    id: 'encapsulation-q10', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value


t = Temperature(20)
try:
    t.celsius = -300
except ValueError as e:
    print("rejected:", e)
print(t.celsius)
try:
    Temperature(-500)
except ValueError:
    print("constructor rejected too")`,
    options: [
      { text: 'rejected: below absolute zero\n20\nconstructor rejected too', correct: true, why: 'The setter rejects -300 before storing anything, so 20 survives. `__init__` assigns through the property too, so `Temperature(-500)` is rejected by the same check.' },
      { text: 'rejected: below absolute zero\n-300\nconstructor rejected too', correct: false, why: 'The setter raises *before* reaching `self._celsius = value`, so the old value 20 is kept. Validating first is what makes a failed assignment harmless.' },
      { text: 'rejected: below absolute zero\n20', correct: false, why: '`self.celsius = celsius` in `__init__` is an ordinary attribute assignment, so it runs the property setter as well. The constructor is validated by the same code.' },
      { text: "rejected: ValueError('below absolute zero')\n20\nconstructor rejected too", correct: false, why: "`print` uses `str(e)`, which for an exception is just its message. `ValueError('below absolute zero')` is the `repr`, which `print(repr(e))` would show." },
    ],
    explanation: `Assigning to \`t.celsius\` calls the property's setter, which checks the value **before** storing it in \`self._celsius\`. A rejected value raises \`ValueError\` and leaves the object unchanged, so the invariant ("never below absolute zero") still holds.

Writing \`self.celsius = celsius\` (not \`self._celsius = celsius\`) in \`__init__\` is deliberate: it routes construction through the same validation, so no object can start out invalid.`,
  },
  {
    id: 'encapsulation-q11', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Rectangle:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.area_at_start = w * h

    @property
    def area(self):
        return self.w * self.h


r = Rectangle(2, 3)
r.w = 10
print(r.area, r.area_at_start)
try:
    r.area = 99
except AttributeError:
    print("read-only")`,
    options: [
      { text: '30 6\nread-only', correct: true, why: 'The `area` getter runs on every access and sees the new width; `area_at_start` is a number stored once. With no setter, assigning to `area` raises `AttributeError`.' },
      { text: '6 6\nread-only', correct: false, why: 'A property is not computed once and cached: its getter runs on *every* access, so it sees the new width 10.' },
      { text: '30 30\nread-only', correct: false, why: '`area_at_start` is a plain attribute holding the number 6, computed in `__init__`. Nothing recalculates it when `w` changes; that staleness is exactly what a computed property avoids.' },
      { text: '30 6', correct: false, why: 'Assigning to a property without a setter does not create an instance attribute that shadows it. The property intercepts the assignment and raises `AttributeError`.' },
    ],
    explanation: `A property's getter runs on **every** attribute access, so a computed property such as \`area\` always reflects the current state and can never go stale. A value stored once in \`__init__\`, like \`area_at_start\`, is only a snapshot.

Because \`area\` defines no setter, it is **read-only**: \`r.area = 99\` raises \`AttributeError: property 'area' of 'Rectangle' object has no setter\`. This works because \`property\` is a *data descriptor*, which takes priority over the instance \`__dict__\` (Module 14).`,
  },
  {
    id: 'encapsulation-q12', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'C++ style guides recommend private data with accessor functions from the start, yet idiomatic Python classes often expose plain attributes such as `self.radius`. Why is that safe in Python?',
    options: [
      { text: 'A plain attribute can later be replaced by a `@property` of the same name: callers keep writing `c.radius` and `c.radius = 5`, which now run your getter and setter. In C++, turning a field into a function changes every call site.', correct: true, why: 'Right. Python lets you add validation later without breaking callers, so writing get/set methods "just in case" buys nothing.' },
      { text: 'Python attributes are private by default, so they are already protected.', correct: false, why: 'Python has no access control: every attribute is reachable from outside, underscore or not. The safety comes from being able to add a property later, not from privacy.' },
      { text: 'Python method calls are too slow to use for simple attribute access.', correct: false, why: 'A property *is* a method call underneath, so it costs about the same as a getter. Speed is not the reason; keeping the caller-facing syntax unchanged is.' },
      { text: 'Python has no way to run validation code when an attribute is assigned, so getters and setters would be pointless.', correct: false, why: 'It does: a property setter (or a descriptor, or `__setattr__`) runs on assignment. That is precisely what makes starting with a plain attribute safe.' },
    ],
    explanation: `In C++, \`c.radius\` (a data member) and \`c.radius()\` (a function call) are different syntax, so switching from one to the other means editing every caller. Classes therefore start with accessors, to keep the option of adding rules later.

Python's \`@property\` makes a method call look exactly like attribute access. Start with \`self.radius = radius\`; when you need validation, add a \`radius\` property backed by \`self._radius\`, and every existing \`c.radius = 5\` now runs your setter. This is the *uniform access principle*: callers should not care whether a value is stored or computed.`,
  },
  {
    id: 'encapsulation-q13', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: "`print` fails to compile with `error: passing 'const Account' as 'this' argument discards qualifiers`. What is the correct fix?",
    codeLang: 'cpp',
    code: `#include <iostream>

class Account {
public:
    explicit Account(double b) : balance_(b) {}
    double balance() { return balance_; }
private:
    double balance_;
};

void print(const Account& a) {
    std::cout << a.balance() << "\\n";   // error reported here
}`,
    options: [
      { text: 'Mark the getter `const`: `double balance() const { return balance_; }`', correct: true, why: 'A `const` member function promises not to modify `*this`, so it may be called through a `const Account&`. Every getter should be `const`.' },
      { text: 'Change `print` to take `Account& a`.', correct: false, why: 'That compiles but fixes the wrong side: `print` now claims it might modify the account, and it can no longer accept `const` accounts or temporaries.' },
      { text: 'Write `const_cast<Account&>(a).balance()` inside `print`.', correct: false, why: 'This silences the compiler instead of fixing the design. Every caller with a const object would need the cast, and modifying a truly const object through it is undefined behavior.' },
      { text: 'Return `const double` instead of `double`.', correct: false, why: '`const` on the returned value is irrelevant here. The problem is the hidden `this` parameter: only a `const` *member function* may be called on a const object.' },
    ],
    explanation: `Inside a member function, \`this\` points to the object. In a non-const member function its type is \`Account*\`; in a \`const\` member function it is \`const Account*\`. Calling a non-const function through a \`const Account&\` would silently drop the promise not to modify the object, so the compiler refuses.

Marking accessors \`const\` is part of a class's interface: it tells callers and the compiler which operations are read-only. Module 13 covers const-correctness in depth.`,
  },
  {
    id: 'encapsulation-q14', lang: 'python', type: 'bug', difficulty: 3,
    prompt: '`Account(10)` crashes with `RecursionError`. What is the bug, and what is the fix?',
    codeLang: 'python',
    code: `class Account:
    def __init__(self, balance):
        self.balance = balance

    @property
    def balance(self):
        return self.balance

    @balance.setter
    def balance(self, value):
        if value < 0:
            raise ValueError("negative balance")
        self.balance = value`,
    options: [
      { text: 'Inside the class, `self.balance` *is* the property, so the setter calls itself (and the getter would too). Store the value in a backing attribute: `self._balance = value` in the setter and `return self._balance` in the getter.', correct: true, why: 'Assigning `self.balance` never reaches a plain attribute: it goes straight back into the setter. A separate name, `_balance`, breaks the cycle.' },
      { text: 'Write `self._balance = balance` in `__init__` instead of `self.balance = balance`.', correct: false, why: 'That skips validation for the initial value, and the property itself is still broken: the next read or write of `acct.balance` recurses forever.' },
      { text: 'Rename the setter function to `set_balance` so it differs from the getter.', correct: false, why: 'With `@balance.setter`, the function name becomes the property name: `set_balance` would be a new property, and `balance` would stay read-only, so `self.balance = ...` raises `AttributeError`.' },
      { text: 'Raise the limit with `sys.setrecursionlimit(100000)`.', correct: false, why: 'The recursion is infinite, not merely deep: every call makes another identical call. A higher limit only lets it run longer before failing.' },
    ],
    explanation: `A property lives on the class and takes priority over the instance \`__dict__\`, so inside the class \`self.balance\` still means **the property**. \`self.balance = value\` inside the setter therefore calls the setter again, forever. The convention is a *backing attribute* with a leading underscore:

~~~python
@property
def balance(self):
    return self._balance

@balance.setter
def balance(self, value):
    if value < 0:
        raise ValueError("negative balance")
    self._balance = value
~~~

Keep \`self.balance = balance\` in \`__init__\`: it runs the validation for the initial value too.`,
  },
  {
    id: 'encapsulation-q15', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print? Note the return types of `songs()` and `copy()`.',
    codeLang: 'cpp',
    code: `#include <cstddef>
#include <iostream>
#include <vector>

class Playlist {
public:
    void add(int song) { if (song > 0) songs_.push_back(song); }
    std::vector<int>& songs() { return songs_; }
    std::vector<int> copy() const { return songs_; }
    std::size_t size() const { return songs_.size(); }
private:
    std::vector<int> songs_;
};

int main() {
    Playlist p;
    p.add(1);
    p.add(-5);                 // rejected by add
    p.songs().push_back(-5);   // no check here
    std::vector<int> c = p.copy();
    c.push_back(7);
    std::cout << p.size() << " " << c.size() << "\\n";
}`,
    options: [
      { text: '2 3', correct: true, why: '`songs()` returns a reference to the private vector itself, so the outside `push_back` lands inside `p` and skips the check in `add`. `copy()` returns an independent vector, so pushing to `c` leaves `p` alone.' },
      { text: '1 2', correct: false, why: 'The return type `std::vector<int>&` is a reference, not a copy. Calling `push_back` on it modifies `p.songs_` directly.' },
      { text: '3 3', correct: false, why: '`copy()` returns `std::vector<int>` by value, a separate object. Adding 7 to `c` does not affect `p`.' },
      { text: 'Compilation error: songs_ is private', correct: false, why: 'Access control checks *names*, not objects. `main` never names `songs_`; it calls the public `songs()`, which is free to hand out a reference. That is exactly the leak.' },
    ],
    explanation: `Returning a **non-const reference** to a private member gives every caller direct write access to it: the \`song > 0\` rule in \`add\` is bypassed, and \`p\` now holds an invalid song. \`private\` protects the *name* \`songs_\`, not the object, so once a reference escapes, the protection is gone.

Safer choices: return \`const std::vector<int>&\` (a read-only view, no copy), return by value (a copy the caller owns), or offer operations like \`size()\` and \`contains()\` so callers never need the container at all.`,
  },
  {
    id: 'encapsulation-q16', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Team:
    def __init__(self, members):
        self._members = list(members)

    def members(self):
        return self._members

    def members_copy(self):
        return list(self._members)


names = ["Ann"]
t = Team(names)
names.append("Bob")
t.members().append("Cid")
t.members_copy().append("Dee")
print(t.members())`,
    options: [
      { text: "['Ann', 'Cid']", correct: true, why: 'The constructor copied `names`, so "Bob" never reaches the team. `members()` hands out the internal list, so "Cid" lands inside; `members_copy()` returns a fresh list, so "Dee" does not.' },
      { text: "['Ann', 'Bob', 'Cid']", correct: false, why: '`list(members)` in `__init__` built a new list, so appending to the caller\'s `names` afterwards does not reach the team.' },
      { text: "['Ann']", correct: false, why: '`members()` returns `self._members` itself. Python never copies on `return`, so `append("Cid")` modifies the internal list.' },
      { text: "['Ann', 'Cid', 'Dee']", correct: false, why: '`list(self._members)` builds a brand-new list; appending "Dee" to that temporary copy leaves the internal list untouched.' },
      { text: "['Ann', 'Bob', 'Cid', 'Dee']", correct: false, why: 'This assumes every list is shared. Only `members()` shares; the constructor and `members_copy()` each make an independent copy.' },
    ],
    explanation: `Python assignment and \`return\` never copy: they hand out another reference to the same object. \`members()\` therefore leaks the internal list, and any caller can change the team without going through its methods. The constructor and \`members_copy()\` make **defensive copies**, so the caller's \`names\` and the returned copy are independent of the team.

Copy on the way in (\`list(members)\`) and on the way out (\`list(...)\` or \`tuple(...)\`). These copies are shallow: if the elements were mutable objects, they would still be shared.`,
  },
];
