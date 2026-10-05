## Putting it all together

The twenty modules before this one taught the pieces. The three capstones ask you to combine them the way a real project does: a hierarchy, ownership, exceptions, and a couple of design patterns in one program. Each capstone comes in C++ and Python, so you can see how the same design is expressed in both languages.

## How to approach a capstone

1. **Read the whole spec first.** Underline every class name, method name and exact string; the tests check exactly those.
2. **Sketch a class diagram** on paper: who inherits from whom, who owns whom (composition), who merely uses whom.
3. **Write the interfaces first.** Declare the abstract base classes and method signatures, then fill in the simplest implementation of each.
4. **Run the tests early and often.** Make one test pass at a time; a red test that names a missing method is a to-do list.
5. **Refactor last**, once everything is green, using the checklist below.

## What each capstone exercises

| Capstone | Modules it draws on |
| --- | --- |
| Shape Studio | 03 lifetime, 06 polymorphism, 07 abstraction, 08 operators, 11 memory/ownership, 16 exceptions, 17 composition |
| Bank System | 04 encapsulation, 05 inheritance, 06 polymorphism, 09 static members, 10 copy/move, 16 exceptions, 18 SOLID, 20 Observer |
| Library Events | 07 abstraction, 11 ownership, 15 generics, 17 composition, 18 SOLID, 19 patterns I, 20 Command, Strategy and Observer |

## OOP design review checklist

Before you call a design finished, ask:

- **Invariants protected?** Can any code put an object into an invalid state (negative balance, triangle with impossible sides)?
- **Ownership clear?** Who creates and destroys each object? Prefer `unique_ptr` in C++ and one clear owner in Python.
- **Virtual destructor** on every polymorphic base class in C++?
- **Does Liskov hold?** Can every subclass be used wherever its base is expected, without surprises?
- **Dependencies injected**, not hard-wired inside the class?
- **No god classes:** does each class have one reason to change?
- **Exceptions specific?** Do you throw a meaningful type from a hierarchy, catch by reference, and keep the strong guarantee where you promised it?

## How the final exam works

The final exam draws questions from **all** modules and reports a **per-module breakdown**. Use it as a map, not a grade: modules where your score is low are the ones to revisit, so re-read their lessons and redo their exercises, then retake the exam. Because it is for learning, you can retake it as often as you like.
