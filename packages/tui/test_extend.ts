import { Container } from "@mariozechner/pi-tui";

export class Test extends Container {}

const t = new Test();
console.log("addChild type:", typeof t.addChild);
t.addChild(Container); // should work, though not semantically
console.log("Success");
