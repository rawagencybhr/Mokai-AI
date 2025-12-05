"use strict";exports.id=258,exports.ids=[258],exports.modules={1258:(t,e,n)=>{var s,i,o,a,r,l,c,d;n.d(e,{$D:()=>G});/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let u=["user","model","function"];(function(t){t.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",t.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",t.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",t.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",t.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT"})(s||(s={})),function(t){t.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",t.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",t.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",t.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",t.BLOCK_NONE="BLOCK_NONE"}(i||(i={})),function(t){t.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",t.NEGLIGIBLE="NEGLIGIBLE",t.LOW="LOW",t.MEDIUM="MEDIUM",t.HIGH="HIGH"}(o||(o={})),function(t){t.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",t.SAFETY="SAFETY",t.OTHER="OTHER"}(a||(a={})),function(t){t.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",t.STOP="STOP",t.MAX_TOKENS="MAX_TOKENS",t.SAFETY="SAFETY",t.RECITATION="RECITATION",t.OTHER="OTHER"}(r||(r={})),function(t){t.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",t.RETRIEVAL_QUERY="RETRIEVAL_QUERY",t.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",t.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",t.CLASSIFICATION="CLASSIFICATION",t.CLUSTERING="CLUSTERING"}(l||(l={})),function(t){t.STRING="STRING",t.NUMBER="NUMBER",t.INTEGER="INTEGER",t.BOOLEAN="BOOLEAN",t.ARRAY="ARRAY",t.OBJECT="OBJECT"}(c||(c={}));/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class h extends Error{constructor(t){super(`[GoogleGenerativeAI Error]: ${t}`)}}class f extends h{constructor(t,e){super(t),this.response=e}}!function(t){t.GENERATE_CONTENT="generateContent",t.STREAM_GENERATE_CONTENT="streamGenerateContent",t.COUNT_TOKENS="countTokens",t.EMBED_CONTENT="embedContent",t.BATCH_EMBED_CONTENTS="batchEmbedContents"}(d||(d={}));class E{constructor(t,e,n,s,i){this.model=t,this.task=e,this.apiKey=n,this.stream=s,this.requestOptions=i}toString(){var t,e;let n=(null===(t=this.requestOptions)||void 0===t?void 0:t.apiVersion)||"v1",s=(null===(e=this.requestOptions)||void 0===e?void 0:e.baseUrl)||"https://generativelanguage.googleapis.com",i=`${s}/${n}/${this.model}:${this.task}`;return this.stream&&(i+="?alt=sse"),i}}async function p(t,e,n){let s;try{if(!(s=await fetch(t.toString(),Object.assign(Object.assign({},function(t){let e={};if((null==t?void 0:t.timeout)>=0){let n=new AbortController,s=n.signal;setTimeout(()=>n.abort(),t.timeout),e.signal=s}return e}(n)),{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-client":"genai-js/0.4.0","x-goog-api-key":t.apiKey},body:e}))).ok){let t="";try{let e=await s.json();t=e.error.message,e.error.details&&(t+=` ${JSON.stringify(e.error.details)}`)}catch(t){}throw Error(`[${s.status} ${s.statusText}] ${t}`)}}catch(n){let e=new h(`Error fetching from ${t.toString()}: ${n.message}`);throw e.stack=n.stack,e}return s}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function g(t){return t.text=()=>{if(t.candidates&&t.candidates.length>0){var e,n,s,i;if(t.candidates.length>1&&console.warn(`This response had ${t.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),T(t.candidates[0]))throw new f(`${C(t)}`,t);return(null===(i=null===(s=null===(n=null===(e=t.candidates)||void 0===e?void 0:e[0].content)||void 0===n?void 0:n.parts)||void 0===s?void 0:s[0])||void 0===i?void 0:i.text)?t.candidates[0].content.parts.map(({text:t})=>t).join(""):""}if(t.promptFeedback)throw new f(`Text not available. ${C(t)}`,t);return""},t.functionCall=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&console.warn(`This response had ${t.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),T(t.candidates[0]))throw new f(`${C(t)}`,t);return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."),O(t)[0]}if(t.promptFeedback)throw new f(`Function call not available. ${C(t)}`,t)},t.functionCalls=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&console.warn(`This response had ${t.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),T(t.candidates[0]))throw new f(`${C(t)}`,t);return O(t)}if(t.promptFeedback)throw new f(`Function call not available. ${C(t)}`,t)},t}function O(t){var e,n,s,i;let o=[];if(null===(n=null===(e=t.candidates)||void 0===e?void 0:e[0].content)||void 0===n?void 0:n.parts)for(let e of null===(i=null===(s=t.candidates)||void 0===s?void 0:s[0].content)||void 0===i?void 0:i.parts)e.functionCall&&o.push(e.functionCall);return o.length>0?o:void 0}let _=[r.RECITATION,r.SAFETY];function T(t){return!!t.finishReason&&_.includes(t.finishReason)}function C(t){var e,n,s;let i="";if((!t.candidates||0===t.candidates.length)&&t.promptFeedback)i+="Response was blocked",(null===(e=t.promptFeedback)||void 0===e?void 0:e.blockReason)&&(i+=` due to ${t.promptFeedback.blockReason}`),(null===(n=t.promptFeedback)||void 0===n?void 0:n.blockReasonMessage)&&(i+=`: ${t.promptFeedback.blockReasonMessage}`);else if(null===(s=t.candidates)||void 0===s?void 0:s[0]){let e=t.candidates[0];T(e)&&(i+=`Candidate was blocked due to ${e.finishReason}`,e.finishMessage&&(i+=`: ${e.finishMessage}`))}return i}function m(t){return this instanceof m?(this.v=t,this):new m(t)}"function"==typeof SuppressedError&&SuppressedError;/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let R=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;async function y(t){let e=[],n=t.getReader();for(;;){let{done:t,value:s}=await n.read();if(t)return g(function(t){let e=t[t.length-1],n={promptFeedback:null==e?void 0:e.promptFeedback};for(let e of t)if(e.candidates)for(let t of e.candidates){let e=t.index;if(n.candidates||(n.candidates=[]),n.candidates[e]||(n.candidates[e]={index:t.index}),n.candidates[e].citationMetadata=t.citationMetadata,n.candidates[e].finishReason=t.finishReason,n.candidates[e].finishMessage=t.finishMessage,n.candidates[e].safetyRatings=t.safetyRatings,t.content&&t.content.parts){n.candidates[e].content||(n.candidates[e].content={role:t.content.role||"user",parts:[]});let s={};for(let i of t.content.parts)i.text&&(s.text=i.text),i.functionCall&&(s.functionCall=i.functionCall),0===Object.keys(s).length&&(s.text=""),n.candidates[e].content.parts.push(s)}}return n}(e));e.push(s)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function A(t,e,n,s){let i=new E(e,d.STREAM_GENERATE_CONTENT,t,!0,s);return function(t){let[e,n]=(function(t){let e=t.getReader();return new ReadableStream({start(t){let n="";return function s(){return e.read().then(({value:e,done:i})=>{let o;if(i){if(n.trim()){t.error(new h("Failed to parse stream"));return}t.close();return}let a=(n+=e).match(R);for(;a;){try{o=JSON.parse(a[1])}catch(e){t.error(new h(`Error parsing JSON response: "${a[1]}"`));return}t.enqueue(o),a=(n=n.substring(a[0].length)).match(R)}return s()})}()}})})(t.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0}))).tee();return{stream:function(t){return function(t,e,n){if(!Symbol.asyncIterator)throw TypeError("Symbol.asyncIterator is not defined.");var s,i=n.apply(t,e||[]),o=[];return s={},a("next"),a("throw"),a("return"),s[Symbol.asyncIterator]=function(){return this},s;function a(t){i[t]&&(s[t]=function(e){return new Promise(function(n,s){o.push([t,e,n,s])>1||r(t,e)})})}function r(t,e){try{var n;(n=i[t](e)).value instanceof m?Promise.resolve(n.value.v).then(l,c):d(o[0][2],n)}catch(t){d(o[0][3],t)}}function l(t){r("next",t)}function c(t){r("throw",t)}function d(t,e){t(e),o.shift(),o.length&&r(o[0][0],o[0][1])}}(this,arguments,function*(){let e=t.getReader();for(;;){let{value:t,done:n}=yield m(e.read());if(n)break;yield yield m(g(t))}})}(e),response:y(n)}}(await p(i,JSON.stringify(n),s))}async function N(t,e,n,s){let i=new E(e,d.GENERATE_CONTENT,t,!1,s),o=await p(i,JSON.stringify(n),s);return{response:g(await o.json())}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function S(t){let e=[];if("string"==typeof t)e=[{text:t}];else for(let n of t)"string"==typeof n?e.push({text:n}):e.push(n);return function(t){let e={role:"user",parts:[]},n={role:"function",parts:[]},s=!1,i=!1;for(let o of t)"functionResponse"in o?(n.parts.push(o),i=!0):(e.parts.push(o),s=!0);if(s&&i)throw new h("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!s&&!i)throw new h("No content is provided for sending chat message.");return s?e:n}(e)}function I(t){return t.contents?t:{contents:[S(t)]}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let w=["text","inlineData","functionCall","functionResponse"],v={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall"]},M={user:["model"],function:["model"],model:["user","function"]},b="SILENT_ERROR";class L{constructor(t,e,n,s){this.model=e,this.params=n,this.requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=t,(null==n?void 0:n.history)&&(function(t){let e;for(let n of t){let{role:t,parts:s}=n;if(!e&&"user"!==t)throw new h(`First content should be with role 'user', got ${t}`);if(!u.includes(t))throw new h(`Each item should include role field. Got ${t} but valid roles are: ${JSON.stringify(u)}`);if(!Array.isArray(s))throw new h("Content should have 'parts' property with an array of Parts");if(0===s.length)throw new h("Each Content should have at least one part");let i={text:0,inlineData:0,functionCall:0,functionResponse:0};for(let t of s)for(let e of w)e in t&&(i[e]+=1);let o=v[t];for(let e of w)if(!o.includes(e)&&i[e]>0)throw new h(`Content with role '${t}' can't contain '${e}' part`);if(e&&!M[t].includes(e.role))throw new h(`Content with role '${t}' can't follow '${e.role}'. Valid previous roles: ${JSON.stringify(M)}`);e=n}}(n.history),this._history=n.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(t){var e,n,s;let i;await this._sendPromise;let o=S(t),a={safetySettings:null===(e=this.params)||void 0===e?void 0:e.safetySettings,generationConfig:null===(n=this.params)||void 0===n?void 0:n.generationConfig,tools:null===(s=this.params)||void 0===s?void 0:s.tools,contents:[...this._history,o]};return this._sendPromise=this._sendPromise.then(()=>N(this._apiKey,this.model,a,this.requestOptions)).then(t=>{var e;if(t.response.candidates&&t.response.candidates.length>0){this._history.push(o);let n=Object.assign({parts:[],role:"model"},null===(e=t.response.candidates)||void 0===e?void 0:e[0].content);this._history.push(n)}else{let e=C(t.response);e&&console.warn(`sendMessage() was unsuccessful. ${e}. Inspect response object for details.`)}i=t}),await this._sendPromise,i}async sendMessageStream(t){var e,n,s;await this._sendPromise;let i=S(t),o={safetySettings:null===(e=this.params)||void 0===e?void 0:e.safetySettings,generationConfig:null===(n=this.params)||void 0===n?void 0:n.generationConfig,tools:null===(s=this.params)||void 0===s?void 0:s.tools,contents:[...this._history,i]},a=A(this._apiKey,this.model,o,this.requestOptions);return this._sendPromise=this._sendPromise.then(()=>a).catch(t=>{throw Error(b)}).then(t=>t.response).then(t=>{if(t.candidates&&t.candidates.length>0){this._history.push(i);let e=Object.assign({},t.candidates[0].content);e.role||(e.role="model"),this._history.push(e)}else{let e=C(t);e&&console.warn(`sendMessageStream() was unsuccessful. ${e}. Inspect response object for details.`)}}).catch(t=>{t.message!==b&&console.error(t)}),a}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function H(t,e,n,s){let i=new E(e,d.COUNT_TOKENS,t,!1,s);return(await p(i,JSON.stringify(Object.assign(Object.assign({},n),{model:e})),s)).json()}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function D(t,e,n,s){let i=new E(e,d.EMBED_CONTENT,t,!1,s);return(await p(i,JSON.stringify(n),s)).json()}async function $(t,e,n,s){let i=new E(e,d.BATCH_EMBED_CONTENTS,t,!1,s),o=n.requests.map(t=>Object.assign(Object.assign({},t),{model:e}));return(await p(i,JSON.stringify({requests:o}),s)).json()}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class F{constructor(t,e,n){this.apiKey=t,e.model.includes("/")?this.model=e.model:this.model=`models/${e.model}`,this.generationConfig=e.generationConfig||{},this.safetySettings=e.safetySettings||[],this.tools=e.tools,this.requestOptions=n||{}}async generateContent(t){let e=I(t);return N(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools},e),this.requestOptions)}async generateContentStream(t){let e=I(t);return A(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools},e),this.requestOptions)}startChat(t){return new L(this.apiKey,this.model,Object.assign({tools:this.tools},t),this.requestOptions)}async countTokens(t){let e=I(t);return H(this.apiKey,this.model,e)}async embedContent(t){let e="string"==typeof t||Array.isArray(t)?{content:S(t)}:t;return D(this.apiKey,this.model,e)}async batchEmbedContents(t){return $(this.apiKey,this.model,t,this.requestOptions)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class G{constructor(t){this.apiKey=t}getGenerativeModel(t,e){if(!t.model)throw new h("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new F(this.apiKey,t,e)}}}};