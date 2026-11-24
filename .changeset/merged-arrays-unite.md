---
'eslint-plugin-no-mercy': patch
---

fix: `getMergedOptions` unites arrays without repeating values, so overriding a policy no longer duplicates its `required` parts of speech; parts-of-speech rejects repeated parts of speech in a policy
