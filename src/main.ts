import './helpers/string-colors.js';
import { getMessageFromModel } from './actions/get-message-model.js';
import { toolUseMain } from './patterns/01-tool-use/tool-use.js';
import { planningMain } from './patterns/02-planning/planning.js';
import { reflectionMain } from './patterns/03-reflection/reflection.js';
import { reActSimpleMain } from './patterns/04-reAct/reAct-loop.js';
import { promptChainingMain } from './patterns/05-promptChaining/promptChaining.js';
import { planAndExecuteMain } from './patterns/06-plan-execute/planExecute.js';
import { codeActMain } from './patterns/07-code-act/codeAct.js';
import { routingMain } from './patterns/08-router/multiAgent.js';
import { orchestratorWorkersMain } from './patterns/09-orquestator/orquestrator.js';
import { parallelizationMain } from './patterns/10-paralelization/paralelization.js';
import { humanInTheLoopMain } from './patterns/11-human-loop/humanLoop.js';

console.clear();

// await getMessageFromModel();

// await toolUseMain();
//await planningMain();
// await reflectionMain();
// await reActSimpleMain();
// await promptChainingMain();
// await planAndExecuteMain();
// await codeActMain();
// await routingMain();
// await orchestratorWorkersMain();
// await parallelizationMain();
await humanInTheLoopMain();