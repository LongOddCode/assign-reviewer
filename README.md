# assign-reviewer

github only support [codeowner](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) currently. You can add a group of users as owner of specific folders or files.

But often, there're some features which will cross lots of files, like "telemetry", "log", etc. For some teams or company, there always be so called "Feature Owner" to own specific feature. And their coworkers will make Pull Request to contribute. This action will help to assign "Feature Owner" as reviewer of your Pull Request.

# usage

```yml
- name: assign reviewer
  uses: LongOddCode/assign-reviewer
  with:
    #github access token.
    token: ${{ secrets.GITHUB_TOKEN }}

    # Github action doesn't support arrary rightnow. So use json array
    # as a workaround.
    # Required.
    reviewers: '["Johnny Silverhand", "Neo", "John Wick", "Keanu"]'

    # Number to assign to reviewer.
    # set 0 if you want assign all of them.
    # Optional. Default 0.
    conscript: 0

    # Which kind of script do you wanna use.
    # Optional. Default "bash" on Linux & Mac. PowerShell on Windows.
    script: bash

    # Set this as true if condition matched.
    # Required.
    result: TELEMETRY_RESULT

    # Your business logic.
    # Required.
    run: |
      line=`git diff -U0 ${{ github.base_ref }} | grep '^[+-]' | grep -Ev '^(--- a/|\+\+\+ b/)' | grep -i "telemetry" | wc -l`
      if [ $line -gt 0 ]; then
        echo '::set-output name=TELEMETRY_RESULT::true'
      fi
```
