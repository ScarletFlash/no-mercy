# Disallow `else` clauses. Use early returns or guard clauses instead (`no-mercy/no-else`)

📝 Disallow `else` clauses. Use early returns or guard clauses instead.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/ScarletFlash/no-mercy#configs).

<!-- end auto-generated rule header -->

## Rule details

Reports any `if` whose `alternate` is a `BlockStatement` (i.e., a literal `else { ... }`).

### Incorrect

```ts
if (a) {
  doX();
} else {
  doY();
}
```

### Correct

```ts
if (a) {
  doX();
  return;
}
doY();
```
