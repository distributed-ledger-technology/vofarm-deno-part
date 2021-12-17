import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";

console.log('I should sleep')
await sleepRandomAmountOfSeconds(5, 10)
console.log('Good Morning :)')
