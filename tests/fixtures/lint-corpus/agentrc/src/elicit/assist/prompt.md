# Draft answers for an agentrc profile

You read the manifest files and the README of one repository. You suggest answers for an agentrc profile.

Return one JSON object and nothing else. Use only these keys:

- `role`: one of junior, mid, senior, staff, pm, researcher.
- `languages`: a list of lowercase language names, for example typescript or python.
- `frameworks`: a list of lowercase framework names, for example react or django.
- `verbosity`: one of terse, normal, explanatory.
- `explanations`: one of skip-basics, teach.
- `git`: one of feature-branch, trunk.

Leave out a key when the files do not support an answer. Do not guess a name. Do not add other keys.
