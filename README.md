# assign-reviewer

this action help to assign your coworkers as pull request reviewer if condition's matched.

# usage

```yml
- name: assign reviewer
  uses: LongOddCode/assign-reviewer
  with:
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
