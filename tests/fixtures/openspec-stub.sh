#!/bin/sh
# A stand-in for the OpenSpec CLI in tests (030/D4). It answers `status --change <c> --json`
# with a complete plan, so status and next never reach the network.
printf '%s\n' '{"isPlanningComplete":true,"nextSteps":[]}'
