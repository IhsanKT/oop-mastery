export default [
  {
    id: 'classes-q01', lang: 'python', type: 'concept', difficulty: 1,
    prompt: 'In a method such as `def speak(self):`, what is `self`?',
    options: [
      { text: 'The object the method was called on: `d.speak()` passes `d` as the first argument, and the parameter receiving it is named `self` by convention.', correct: true, why: 'Right. Python inserts the instance as the first positional argument, and `self` is just the customary name for that parameter.' },
      { text: 'A reserved keyword, like `this` in C++, that Python makes available inside every class.', correct: false, why: '`self` is not a keyword: `def speak(me):` works the same way. It is only a convention (a universal one). C++\'s `this` *is* a keyword and is implicit; Python\'s `self` is an ordinary, explicit parameter.' },
      { text: 'The class itself, so `self.name` reads a variable shared by all instances.', correct: false, why: 'That describes `cls` in a `@classmethod` (Module 09). In an ordinary method, `self` is one particular instance, and `self.name` is that object\'s own attribute.' },
      { text: 'A copy of the object, so changes made through `self` are discarded when the method returns.', correct: false, why: 'Python never copies objects when calling a function. `self` refers to the very same object as `d`, so `self.age += 1` changes `d`.' },
    ],
    explanation: `A method is an ordinary function stored on the class. For \`d.speak()\`, Python finds \`speak\` on \`type(d)\` and calls it with \`d\` as the first argument, so \`self\` is bound to \`d\` for that call. Because the object is an explicit parameter, every attribute access inside a method must be written \`self.name\`.

C++ does the same thing implicitly: the object arrives as the hidden pointer \`this\`, and a bare \`name\` means \`this->name\`.`,
  },
  {
    id: 'classes-q02', lang: 'python', type: 'output', difficulty: 1,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Dog:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return self.name + " says woof"


d = Dog("Rex")
print(d.speak())
print(Dog.speak(d))
try:
    print(Dog.speak())
except TypeError:
    print("TypeError")`,
    options: [
      { text: 'Rex says woof\nRex says woof\nTypeError', correct: true, why: '`Dog.speak(d)` passes `d` explicitly as `self`, which is exactly what `d.speak()` does for you. `Dog.speak()` supplies no object at all, so the required `self` argument is missing.' },
      { text: 'Rex says woof\nTypeError\nTypeError', correct: false, why: 'Methods are not restricted to calls through an instance. Calling through the class is legal; you simply pass the instance yourself as the first argument.' },
      { text: 'Rex says woof\nRex says woof\nRex says woof', correct: false, why: 'Python has no notion of a "current object" that it remembers between calls. Without an argument, nothing is bound to `self`.' },
      { text: 'Rex says woof\nRex says woof\nNone says woof', correct: false, why: 'Missing arguments never default to `None`. A parameter without a default value must be supplied, or the call raises `TypeError` before the body runs.' },
    ],
    explanation: `\`d.speak()\` is shorthand: Python looks up \`speak\` on \`type(d)\` and calls \`Dog.speak(d)\`. Accessed through the class, \`Dog.speak\` is the plain function with nothing bound to it, so the caller must provide \`self\`. That is why the last call fails with \`TypeError: Dog.speak() missing 1 required positional argument: 'self'\`.

Accessed through the instance, \`d.speak\` is a *bound method* that remembers \`d\` and inserts it as the first argument when called.`,
  },
  {
    id: 'classes-q03', lang: 'cpp', type: 'concept', difficulty: 1,
    prompt: 'In C++, what is the difference between `struct Point { int x; };` and `class Point { int x; };`?',
    options: [
      { text: 'Only the default access: members (and base classes) are `public` by default in a `struct` and `private` in a `class`. Otherwise the two are identical.', correct: true, why: 'Right. Both keywords create a class type with the same capabilities; only the access you get without writing `public:`/`private:` differs.' },
      { text: 'A `struct` can only hold data; member functions, constructors and inheritance require `class`.', correct: false, why: 'That is true of C, not C++. A C++ `struct` can have member functions, constructors, private members, base classes and virtual functions, exactly like a `class`.' },
      { text: '`struct` objects live on the stack and `class` objects live on the heap.', correct: false, why: 'That confuses C++ with C#, where structs are value types and classes reference types. In C++ storage depends on how an object is created (a local variable, `new`, a member), never on the keyword.' },
      { text: 'Members of a `struct` can never be made private.', correct: false, why: 'You can write `private:` inside a `struct`. The keyword only chooses the *default*; any access level can be set explicitly in either.' },
    ],
    explanation: `\`struct\` and \`class\` declare the same kind of type. The keyword decides two defaults: member access (\`struct\`: public, \`class\`: private) and base-class access (\`struct D : B\` inherits publicly, \`class D : B\` privately).

By convention, \`struct\` is used for simple bundles of public data with no rules to protect, and \`class\` for types that guard an invariant behind private members. That is a style choice that tells readers what to expect, not a language rule.`,
  },
  {
    id: 'classes-q04', lang: 'python', type: 'bug', difficulty: 1,
    prompt: 'Calling `c.increment()` raises `TypeError: Counter.increment() takes 0 positional arguments but 1 was given`. What is wrong?',
    codeLang: 'python',
    code: `class Counter:
    def __init__(self):
        self.value = 0

    def increment():
        self.value += 1


c = Counter()
c.increment()`,
    options: [
      { text: '`increment` declares no `self` parameter, but `c.increment()` always passes `c` as the first argument. Define it as `def increment(self):`.', correct: true, why: 'The method call supplies one positional argument (the instance), and the function accepts none. Adding `self` both fixes the count and gives the body the object it needs.' },
      { text: 'It should be called as `Counter.increment()`: methods are meant to be called on the class.', correct: false, why: 'Calling through the class passes no instance, so the arity error disappears but the body then fails with `NameError: name \'self\' is not defined`. The method needs an object.' },
      { text: '`value` must first be declared at class level (`value = 0`) before a method can use `self.value`.', correct: false, why: 'Python attributes need no declaration; `__init__` already created `self.value`. Besides, the error is raised at the call, before the body even runs.' },
      { text: 'The method needs the `@staticmethod` decorator so that it can be called without arguments.', correct: false, why: 'A static method receives no instance, so `self.value` inside it would raise `NameError`. This method works on an object, so it needs a `self` parameter.' },
    ],
    explanation: `Python passes the instance **explicitly**: \`c.increment()\` becomes \`Counter.increment(c)\`. The function was declared with zero parameters, so the call fails immediately, before the body runs, with "takes 0 positional arguments but 1 was given". The count includes the instance Python passed for you, which is why it says "1 was given" even though the parentheses at the call site are empty.

C++ cannot have this bug: the object is passed implicitly as \`this\`, so member functions never list it.`,
  },
  {
    id: 'classes-q05', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class A:
    count = 0


a = A()
b = A()
a.count = 5
print(A.count, a.count, b.count)
A.count = 7
print(A.count, a.count, b.count)`,
    options: [
      { text: '0 5 0\n7 5 7', correct: true, why: '`a.count = 5` creates an attribute on `a` that shadows the class attribute. `b` has no `count` of its own, so it always reads the current `A.count`.' },
      { text: '5 5 5\n7 7 7', correct: false, why: 'Assigning through an instance never modifies the class attribute (that is how a C++ `static` member behaves). In Python it creates a new attribute on that one instance.' },
      { text: '0 5 0\n7 7 7', correct: false, why: 'Changing `A.count` cannot override `a`\'s own attribute: lookup checks the instance first, so `a.count` stays 5 until the instance attribute is deleted.' },
      { text: '0 5 0\n7 5 0', correct: false, why: 'Instances do not take a snapshot of class attributes when created. `b.count` is looked up on the class at the moment it is read, so it sees 7.' },
    ],
    explanation: `Reading \`obj.attr\` looks in the instance's own \`__dict__\` first and falls back to the class. **Assigning** \`obj.attr = value\` always writes to the instance's \`__dict__\`. So \`a.count = 5\` gives \`a\` a private \`count\` that **shadows** \`A.count\`, while \`b\` keeps reading through to the class and sees every change to it.

To change shared data, assign through the class (\`A.count = 7\`). \`del a.count\` would remove the shadow and make \`a.count\` read the class value again.`,
  },
  {
    id: 'classes-q06', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Team:
    members = []

    def __init__(self, name):
        self.name = name

    def add(self, person):
        self.members.append(person)


red = Team("red")
blue = Team("blue")
red.add("Ada")
blue.add("Bob")
print(red.members)
print(blue.members is red.members, "members" in vars(red))`,
    options: [
      { text: "['Ada', 'Bob']\nTrue False", correct: true, why: 'There is one list, created once with the class. Both `add` calls find it through the class and append to it; neither instance ever gets a `members` attribute of its own.' },
      { text: "['Ada']\nFalse True", correct: false, why: 'Instances do not receive their own copies of class attributes when created (unlike ordinary C++ data members). A list written in the class body is a single object shared by every instance.' },
      { text: "['Ada', 'Bob']\nTrue True", correct: false, why: '`self.members.append(...)` *reads* `self.members` and mutates the list it finds. Only an assignment such as `self.members = [...]` would create an instance attribute.' },
      { text: 'AttributeError', correct: false, why: 'An instance can read class attributes: when `members` is not in the instance\'s `__dict__`, lookup falls back to the class and finds the list there.' },
    ],
    explanation: `The class body runs **once**, so \`members = []\` creates a single list stored on the class. \`self.members\` finds no instance attribute and falls back to \`Team.members\`, and \`append\` mutates that shared list in place. Mutation is not assignment, so no shadowing instance attribute is created.

The fix is to create per-object state in \`__init__\`:

~~~python
def __init__(self, name):
    self.name = name
    self.members = []   # a new list for every Team
~~~`,
  },
  {
    id: 'classes-q07', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'After running this code, what does `vars(d)` return?',
    codeLang: 'python',
    code: `class Dog:
    species = "canine"

    def __init__(self, name):
        self.name = name

    def speak(self):
        return "woof"


d = Dog("Rex")
d.age = 3`,
    options: [
      { text: "`{'name': 'Rex', 'age': 3}`", correct: true, why: '`vars(d)` is `d.__dict__`: exactly the attributes stored on the instance, whether `__init__` created them or later code did.' },
      { text: "`{'species': 'canine', 'name': 'Rex', 'age': 3}`", correct: false, why: 'Class attributes are not copied into instances. `species` lives in `Dog.__dict__` and is only *found* through `d` by lookup; `vars(Dog)` would show it.' },
      { text: "`{'name': 'Rex'}`", correct: false, why: 'Attributes are not limited to those created in `__init__`. Assigning `d.age = 3` later added a key to the same dictionary.' },
      { text: "`{'name': 'Rex', 'age': 3, 'speak': <bound method>}`", correct: false, why: 'Methods are stored on the class, not on each object. `d.speak` builds a bound method on demand when it is accessed.' },
    ],
    explanation: `\`vars(obj)\` returns \`obj.__dict__\`, the instance's own namespace (the real dict, not a copy). It shows only what is stored on the object itself. Class attributes and methods live in the class's namespace, \`vars(Dog)\`, a read-only \`mappingproxy\`.

To see everything *reachable* through an object, including class and inherited attributes, use \`dir(d)\`. Objects without a \`__dict__\` (such as an \`int\`, or instances of a class using \`__slots__\`) make \`vars()\` raise \`TypeError\`.`,
  },
  {
    id: 'classes-q08', lang: 'both', type: 'compare', difficulty: 2,
    prompt: `\`rex\` is an object whose class defines only \`name\` and \`age\`. The C++ code runs \`rex.nickname = "R";\` and the Python code below does the same. What happens in each language?`,
    codeLang: 'python',
    code: `rex = Dog("Rex", 3)
rex.nickname = "R"
fido = Dog("Fido", 5)`,
    options: [
      { text: 'C++: a compile error (the class has no member named `nickname`). Python: it works and adds `nickname` to `rex` only; `fido` has no such attribute.', correct: true, why: 'A C++ class fixes its members at compile time. A Python instance stores attributes in its own dict, so assignment can add new ones to that single object.' },
      { text: 'Both report an error, because `nickname` was never declared in the class.', correct: false, why: 'Python has no attribute declarations: attributes are created by assignment, anywhere and at any time. Only C++ checks member names against the class.' },
      { text: 'C++ compiles but writes to memory outside the object (undefined behavior); Python raises `AttributeError`.', correct: false, why: 'C++ checks member names at compile time, so the code never runs. Python raises `AttributeError` when *reading* a missing attribute, not when assigning a new one.' },
      { text: 'C++: a compile error. Python: `nickname` becomes a class attribute, so `fido.nickname` is `"R"` too.', correct: false, why: 'Assigning through an instance writes to that instance\'s `__dict__`, never to the class. `fido.nickname` raises `AttributeError`.' },
    ],
    explanation: `A C++ object's layout is fixed by its class definition: the compiler knows its size and each member's position, and rejects \`rex.nickname\` with *'class Dog' has no member named 'nickname'*. A Python object normally keeps its attributes in a per-instance dict, so assignment adds keys freely, and two objects of one class can end up with different attributes.

The flip side is that a typo such as \`rex.agee = 4\` silently creates a new attribute. Creating every attribute in \`__init__\` avoids surprises, and \`__slots__\` (Module 14) makes Python reject unknown names.`,
  },
  {
    id: 'classes-q09', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"({self.x}, {self.y})"

    def __repr__(self):
        return f"Point({self.x}, {self.y})"


p = Point(1, 2)
print(p)
print([p])
print(f"at {p}")
print(str([p]))`,
    options: [
      { text: '(1, 2)\n[Point(1, 2)]\nat (1, 2)\n[Point(1, 2)]', correct: true, why: '`print`, f-strings and `str()` use `__str__` for the object itself, but a list formats its elements with `repr()`, whether you print the list or call `str()` on it.' },
      { text: '(1, 2)\n[(1, 2)]\nat (1, 2)\n[(1, 2)]', correct: false, why: 'Containers do not pass `str()` down to their items. `str(list)` builds its text from `repr()` of each element.' },
      { text: 'Point(1, 2)\n[Point(1, 2)]\nat Point(1, 2)\n[Point(1, 2)]', correct: false, why: '`__repr__` is only the fallback for `str()` when a class lacks `__str__`. Here `__str__` exists, so `print(p)` and the f-string use it.' },
      { text: '(1, 2)\n[Point(1, 2)]\nat Point(1, 2)\n[(1, 2)]', correct: false, why: 'A plain `{p}` in an f-string formats with `format()`, which uses `__str__` by default; `{p!r}` would ask for `repr`. And `str(list)` still uses `repr` for the elements.' },
    ],
    explanation: `\`__str__\` is the *user-facing* text: \`print(obj)\`, \`str(obj)\` and f-strings use it. \`__repr__\` is the *developer-facing* text: \`repr()\`, the interactive prompt, and **containers**, which show their elements with \`repr()\` so that \`['1']\` and \`[1]\` look different.

If you implement just one, implement \`__repr__\`: \`str()\` falls back to it, but not the other way round.`,
  },
  {
    id: 'classes-q10', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: "GCC rejects `dog.cpp` with errors including *non-member function 'void speak()' cannot have cv-qualifier* and *'name' was not declared in this scope*. What is the fix?",
    codeLang: 'cpp',
    code: `// dog.h
#pragma once
#include <string>

class Dog {
public:
    std::string name;
    void speak() const;
};

// dog.cpp
#include "dog.h"
#include <iostream>

void speak() const {
    std::cout << name << " says woof\\n";
}`,
    options: [
      { text: 'Qualify the name with the class: `void Dog::speak() const { ... }`. Without `Dog::` this defines a brand-new free function, which has no object and therefore no `name`.', correct: true, why: 'The `Dog::` qualifier says "this is the body of the `speak` declared in `Dog`", which puts the class members (and `this`) in scope.' },
      { text: 'Write `this->name` instead of `name`.', correct: false, why: 'A free function has no `this` at all; GCC would report invalid use of \'this\' in non-member function. The function is simply not a member.' },
      { text: 'Remove the `const` from the definition.', correct: false, why: 'That silences only the first error. The function is still a free function that cannot see `name`, and `Dog::speak` remains undefined, so calls to it would fail to link.' },
      { text: 'Include `<iostream>` before `"dog.h"`.', correct: false, why: 'Include order is not the problem. `name` is a data member, and only member functions of `Dog` can use it without naming an object.' },
    ],
    explanation: `A member function defined outside its class must be named with the class qualifier: \`void Dog::speak() const\`. The \`::\` (scope resolution operator) ties the body to the declaration inside \`Dog\`, so inside it \`name\` means \`this->name\`. The signature must match the declaration exactly, including the trailing \`const\`.

If the stray function had compiled (say it printed only "woof"), the error would move to link time: *undefined reference to \`Dog::speak() const'*, because the member that callers use was never defined.`,
  },
  {
    id: 'classes-q11', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Inside `getAge() const`, what is the type of `this`, and what does that imply?',
    codeLang: 'cpp',
    code: `#include <string>

class Dog {
public:
    void rename(const std::string& n) { name_ = n; }
    int getAge() const {
        return age_;   // what is the type of 'this' here?
    }
private:
    std::string name_;
    int age_ = 0;
};`,
    options: [
      { text: '`const Dog*`: the object is read-only through it, so `getAge` can neither assign to `age_` nor call non-const members such as `rename`.', correct: true, why: 'The trailing `const` applies to the object `this` points to. Assigning a member is rejected, and calling `rename()` discards the `const`, which GCC also rejects.' },
      { text: '`Dog* const`: the pointer cannot be changed, but the object can still be modified freely.', correct: false, why: 'That puts the `const` in the wrong place. `this` can never be reassigned in any member function; the `const` after the parameter list makes the *pointed-to object* const.' },
      { text: '`Dog&`: in C++, `this` is a reference to the current object.', correct: false, why: '`this` is a pointer, which is why members are reached with `this->name_`. The object itself is `*this`; that is what chaining functions return.' },
      { text: '`Dog*`, as in every member function: `const` only documents intent, and the compiler does not check it.', correct: false, why: 'The compiler enforces it: `age_ = 1;` inside `getAge` fails with assignment of member \'Dog::age_\' in read-only object.' },
    ],
    explanation: `In a member function of class \`X\` declared \`const\`, \`this\` has type \`const X*\`, so every data member is accessed as const. The function cannot modify members (except those declared \`mutable\`, Module 13) and can only call other \`const\` member functions.

The payoff comes at the call site: only \`const\` member functions can be called on a \`const\` object or through a \`const X&\`. Calling a non-const one fails with *passing 'const Dog' as 'this' argument discards qualifiers*. So mark every member function that does not modify the object \`const\`. Python has no equivalent check.`,
  },
  {
    id: 'classes-q12', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

class Counter {
public:
    Counter& add(int n) { value_ += n; return *this; }
    Counter& times(int n) { value_ *= n; return *this; }
    int value() const { return value_; }
private:
    int value_ = 0;
};

int main() {
    Counter c;
    c.add(2).times(5).add(1);
    std::cout << c.value() << "\\n";
    Counter& r = c.add(4);
    r.add(10);
    std::cout << c.value() << "\\n";
}`,
    options: [
      { text: '11\n25', correct: true, why: 'Each call returns a reference to `c`, so the chain computes (0 + 2) * 5 + 1 = 11 on `c` itself. `r` is another name for `c`: +4 and +10 give 25.' },
      { text: '11\n15', correct: false, why: '`Counter& r = c.add(4);` binds a reference, not a copy. `r.add(10)` therefore changes `c`.' },
      { text: '2\n6', correct: false, why: 'Returning `Counter&` means each later call in the chain runs on `c` itself. Only a by-value return type would leave the later calls working on temporary copies.' },
      { text: '7\n21', correct: false, why: 'Chained calls run left to right: each call is made on the result of the one before it, so `add(2)` must run first. Right to left would give (0 + 1) * 5 + 2 = 7.' },
    ],
    explanation: `\`return *this;\` with return type \`Counter&\` hands back a reference to the object the method was called on, so \`c.add(2).times(5).add(1)\` makes three calls on \`c\` itself, in order. Binding that result to \`Counter& r\` makes \`r\` an alias of \`c\`.

This is the **method chaining** idiom (also called a fluent interface). The return type is essential: with \`Counter add(int)\` each call returns a copy, and the rest of the chain modifies temporaries that vanish at the semicolon.`,
  },
  {
    id: 'classes-q13', lang: 'both', type: 'compare', difficulty: 2,
    prompt: `Both functions try to rename a dog. The C++ version is:

~~~cpp
struct Dog { std::string name; };
void rename(Dog d) { d.name = "Max"; }

Dog rex{"Rex"};
rename(rex);
std::cout << rex.name;
~~~

What does each program print?`,
    codeLang: 'python',
    code: `class Dog:
    def __init__(self, name):
        self.name = name


def rename(d):
    d.name = "Max"


rex = Dog("Rex")
rename(rex)
print(rex.name)`,
    options: [
      { text: 'C++ prints `Rex`; Python prints `Max`. The C++ parameter is a copy of `rex`, while the Python parameter is a second name for the very same object.', correct: true, why: 'C++ passes class objects by value unless the parameter is a reference. Python passes by sharing: `d` and `rex` refer to one object, so the mutation is visible.' },
      { text: 'Both print `Max`: objects are always passed by reference.', correct: false, why: 'That is true of neither language in general. C++ passes by value unless the parameter is declared `Dog&` (or `const Dog&`), so `rename` changed only its own copy.' },
      { text: 'Both print `Rex`: both languages pass arguments by value.', correct: false, why: 'Python copies only the *reference*, never the object. The function receives the caller\'s object, so changing `d.name` changes `rex.name`.' },
      { text: 'C++ prints `Max`; Python prints `Rex`.', correct: false, why: 'This reverses the two rules. The C++ by-value parameter is the copy; Python is the one where the function sees the caller\'s object.' },
      { text: 'Both print `Rex`, but Python would print `Max` if `rename` declared `global rex`.', correct: false, why: '`global` matters only when *rebinding* a name. `d.name = ...` mutates the shared object, which needs no declaration at all.' },
    ],
    explanation: `In C++, a by-value parameter is a new object copied from the argument, so changes stay local. Write \`void rename(Dog& d)\` to modify the caller's object, or \`const Dog&\` to read it without copying.

Python uses **call by sharing**: the parameter is bound to the same object as the argument. Mutating that object (\`d.name = "Max"\`) is visible to the caller; *rebinding* the parameter (\`d = Dog("Max")\`) would not be, because it only changes what the local name refers to.`,
  },
  {
    id: 'classes-q14', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

struct Dog {
    std::string name;
    int age = 0;
};

void byValue(Dog d) { d.age += 10; }
void byRef(Dog& d) { d.age += 1; }
void replace(Dog& d) {
    Dog other{"Max", 1};
    d = other;
    other.age = 99;
}

int main() {
    Dog rex{"Rex", 3};
    byValue(rex);
    byRef(rex);
    std::cout << rex.name << " " << rex.age << "\\n";
    replace(rex);
    std::cout << rex.name << " " << rex.age << "\\n";
}`,
    options: [
      { text: 'Rex 4\nMax 1', correct: true, why: '`byValue` changes a copy; `byRef` adds 1 to `rex`. In `replace`, `d = other` copies `other` into `rex`, and the later change to `other` does not affect that copy.' },
      { text: 'Rex 14\nMax 1', correct: false, why: 'A by-value parameter is a separate object copied from the argument. `byValue` adds 10 to that copy, which is destroyed when the function returns.' },
      { text: 'Rex 4\nRex 4', correct: false, why: 'That is Python intuition, where assigning to a parameter only rebinds the local name. A C++ reference cannot be rebound: assigning through it overwrites the caller\'s object.' },
      { text: 'Rex 4\nMax 99', correct: false, why: '`d = other` does not turn `d` into an alias of `other`. It copies the values once, so `rex` is a separate object and keeps age 1.' },
      { text: 'Rex 3\nMax 1', correct: false, why: 'A reference parameter is another name for the caller\'s object, so `byRef` really does change `rex.age` from 3 to 4.' },
    ],
    explanation: `A reference is bound once, when it is initialized, and is an alias for that object forever after. So in \`replace\`, \`d = other;\` is not "make \`d\` refer to \`other\`"; it is \`rex = other;\`, a copy assignment that overwrites \`rex\`'s members with Max's. \`other\` stays a separate object, so setting \`other.age = 99\` changes nothing in \`rex\`.

Compare Python, where \`d = Dog("Max", 1)\` inside a function only rebinds the local name and leaves the caller's object untouched.`,
  },
  {
    id: 'classes-q15', lang: 'cpp', type: 'bug', difficulty: 3,
    prompt: 'This compiles cleanly but prints `2` instead of `6`. What is wrong?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

class Order {
public:
    Order add(const std::string& item, int qty) {
        count_ += qty;
        last_ = item;
        return *this;
    }
    int count() const { return count_; }
private:
    int count_ = 0;
    std::string last_;
};

int main() {
    Order o;
    o.add("apple", 2).add("pear", 3).add("fig", 1);
    std::cout << o.count() << "\\n";   // expected 6
}`,
    options: [
      { text: '`add` returns `Order` **by value**, so each chained call runs on a temporary copy; only the first `add` touches `o`. Declare it `Order& add(...)` to return a reference to `*this`.', correct: true, why: '`return *this;` with a by-value return type copies the object. `.add("pear", 3)` then updates that temporary, which is destroyed at the end of the statement.' },
      { text: 'It should `return this;` instead of `return *this;`.', correct: false, why: '`this` is a pointer (`Order*`); returning it from a function declared to return `Order` does not compile. Even with a pointer return type, chaining would need `->` instead of `.`.' },
      { text: 'Chained calls run right to left, so the later `add` calls finish before `o` has been updated.', correct: false, why: 'In `a.f().g()`, `g` is called *on the result of* `f`, so `f` must run first. The calls run left to right; the problem is which object they run on.' },
      { text: 'Calls on temporaries are silently skipped, because temporaries are `const`.', correct: false, why: 'A temporary of class type is not `const`, and non-const member functions can be called on it. The calls do run; their effects just land on a copy that is thrown away.' },
      { text: '`int count_ = 0;` runs again on every call, resetting the count.', correct: false, why: 'A default member initializer runs only when an object is constructed without an explicit initializer for that member. Calling a member function never re-initializes members.' },
    ],
    explanation: `With return type \`Order\`, \`return *this;\` copy-constructs a new temporary \`Order\` from \`*this\`. The chain \`o.add("apple", 2).add("pear", 3)\` therefore calls the second \`add\` on that temporary, not on \`o\`, and the temporaries are destroyed at the semicolon. \`o\` received only the first call, so \`count()\` is 2.

The fix is one character, \`Order& add(...)\`, returning a reference to the object itself. Python cannot have this bug: \`return self\` returns the same object, never a copy.`,
  },
  {
    id: 'classes-q16', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'A `Date` class keeps `year_`, `month_` and `day_` private and offers public `year()`, `month()`, `day()` and `addDays(int)`. You need `daysBetween(a, b)`, which can be computed using only those public functions. Following the usual C++ guidance (C++ Core Guidelines C.4), where should it go?',
    options: [
      { text: 'A free (non-member) function, `int daysBetween(const Date& a, const Date& b)`: it needs no private access, treats both dates alike, and keeps the set of functions that touch the private data small.', correct: true, why: 'Make a function a member only if it needs direct access to the representation. Fewer members means fewer places to check when the representation or invariant changes.' },
      { text: 'A member function, because in OOP every operation involving an object must be one of its methods.', correct: false, why: 'OOP does not require that. Encapsulation is actually *stronger* when only the functions that need the private data can see it.' },
      { text: 'A member function, because free functions cannot take class objects as parameters or call their methods.', correct: false, why: 'A free function can take `const Date&` parameters and call every public member function on them.' },
      { text: 'A `friend` function, so it can read `year_`, `month_` and `day_` directly.', correct: false, why: 'A `friend` gets private access it does not need, widening the code that depends on the representation (Module 04). Use `friend` only when the public interface truly is not enough.' },
      { text: 'In Python it must be a method: free functions that operate on objects are not idiomatic Python.', correct: false, why: 'Module-level functions are idiomatic Python; built-ins such as `len()` and `sorted()` are free functions too. `days_between(a, b)` in the module is perfectly natural.' },
    ],
    explanation: `A function belongs **inside** the class when it needs the private representation or maintains the invariant (\`addDays\` must keep the date valid). When the public interface is enough, a **non-member** function is often better: it cannot break the invariant, it does not need to change if the representation changes, it treats its arguments symmetrically (\`a\` is not special), and it can be added without editing the class.

The same idea applies in Python: write \`days_between(a, b)\` as a module-level function next to the class.`,
  },
];
