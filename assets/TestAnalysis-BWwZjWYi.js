import{c as Z,u as ee,r,j as e,T as se,U as $,F as q,X as E,a as ae,f as te,d as ne,o as ie,g as le,l as P}from"./index-DOv-VC2m.js";import{T as U}from"./trash-2-BnfjC1M8.js";import{C as I}from"./chevron-down-BuKz14xV.js";import{P as O}from"./plus-bGae22dd.js";import{L as ce}from"./layers-D-RSdqgz.js";const re=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],L=Z("chevron-up",re),H=c=>{const d=c.split(".").pop().toLowerCase();return["pdf"].includes(d)?"PDF":["doc","docx"].includes(d)?"Word":["xls","xlsx"].includes(d)?"Excel":["csv"].includes(d)?"CSV":"File"};function he(){const c=ee(),d=r.useRef(null),C=r.useRef(null),[o,j]=r.useState([]),[v,z]=r.useState(!1),[n,g]=r.useState(null),[A,J]=r.useState({}),[m,N]=r.useState([]),[y,D]=r.useState(!1),[l,f]=r.useState(null),[w,M]=r.useState({}),R=()=>{try{return JSON.parse(localStorage.getItem("vpt-docs")||"[]").filter(s=>s.status==="parsed")}catch{return[]}},F=s=>new Promise(a=>{const i=new FileReader;i.onload=t=>a(t.target.result||""),i.onerror=()=>a(""),i.readAsText(s)}),_=s=>{const i=Array.from(s.target.files||[]).map(t=>({file:t,name:t.name,type:H(t.name),size:t.size}));j(t=>[...t,...i]),s.target.value=""},B=s=>j(a=>a.filter((i,t)=>t!==s)),W=async()=>{const s=R();if(o.length===0){c.info("Upload test scenarios/cases to analyze");return}if(s.length===0){c.info("No parsed documents in Document Hub to compare against");return}z(!0),g(null);try{const a=await Promise.all(o.map(async u=>{const S=await F(u.file);return`--- File: ${u.name} ---
${S.substring(0,3e3)}`})),t=`You are a test analysis expert. Compare the uploaded test scenarios/cases against the project requirements documents.

PROJECT REQUIREMENTS DOCUMENTS:
${s.map(u=>{const S=(u.aiRequirements||[]).map(T=>`${T.id}: ${T.title} - ${T.description||""}`).join(`
`);return`Document: ${u.name}
Summary: ${u.aiSummary||"N/A"}
Requirements:
${S||"None extracted"}`}).join(`

`)}

UPLOADED TEST SCENARIOS/CASES:
${a.join(`

`)}

Analyze and respond in this exact JSON format:
{
  "coverageScore": <number 0-100>,
  "totalRequirements": <number>,
  "coveredRequirements": <number>,
  "gaps": [
    {
      "id": "GAP-001",
      "requirement": "<requirement that is not covered>",
      "severity": "high|medium|low",
      "description": "<why this is a gap>",
      "suggestedTests": ["<test case 1>", "<test case 2>"]
    }
  ],
  "additionalTests": [
    {
      "id": "AT-001",
      "title": "<test case title>",
      "description": "<what to test>",
      "priority": "high|medium|low",
      "coversGap": "GAP-001"
    }
  ],
  "summary": "<2-3 sentence summary of the analysis>"
}`,p=await P(t,"test-gap-analysis"),h=p.response||p.message||"",x=h.match(/\{[\s\S]*\}/);x?(g(JSON.parse(x[0])),c.success("Gap analysis complete")):(c.info("AI returned analysis but could not parse structured results"),g({summary:h,gaps:[],additionalTests:[],coverageScore:0,totalRequirements:0,coveredRequirements:0}))}catch(a){console.error("Gap analysis failed:",a),c.info("AI unavailable — check if the server is running")}finally{z(!1)}},Y=s=>{const i=Array.from(s.target.files||[]).map(t=>({file:t,name:t.name,type:H(t.name),size:t.size}));N(t=>[...t,...i]),s.target.value=""},Q=s=>N(a=>a.filter((i,t)=>t!==s)),V=async()=>{if(m.length===0){c.info("Upload test case files to check for duplicates");return}D(!0),f(null);try{const a=`You are a test case analysis expert. Analyze the following test cases/scenarios to find duplicates, near-duplicates, and overlapping test coverage.

TEST CASES:
${(await Promise.all(m.map(async h=>{const x=await F(h.file);return`--- File: ${h.name} ---
${x.substring(0,4e3)}`}))).join(`

`)}

Respond in this exact JSON format:
{
  "totalTestCases": <number>,
  "duplicateGroups": [
    {
      "id": "DUP-001",
      "severity": "exact|near|overlap",
      "tests": ["<test name 1>", "<test name 2>"],
      "reason": "<why these are duplicates>",
      "recommendation": "remove|merge|keep"
    }
  ],
  "stats": {
    "exact": <number of exact duplicate groups>,
    "near": <number of near-duplicate groups>,
    "overlap": <number of overlapping groups>,
    "savingsPercent": <estimated % reduction if duplicates removed>
  },
  "summary": "<2-3 sentence summary>"
}`,i=await P(a,"duplicate-detection"),t=i.response||i.message||"",p=t.match(/\{[\s\S]*\}/);p?(f(JSON.parse(p[0])),c.success("Duplicate detection complete")):(c.info("AI returned analysis but could not parse structured results"),f({summary:t,duplicateGroups:[],totalTestCases:0,stats:{exact:0,near:0,overlap:0,savingsPercent:0}}))}catch(s){console.error("Duplicate detection failed:",s),c.info("AI unavailable — check if the server is running")}finally{D(!1)}},X=s=>J(a=>({...a,[s]:!a[s]})),K=s=>M(a=>({...a,[s]:!a[s]})),G=s=>s==="high"||s==="exact"?"var(--danger)":s==="medium"||s==="near"?"var(--warning)":"var(--info)",b=s=>s==="high"||s==="exact"?"badge-danger":s==="medium"||s==="near"?"badge-warning":"badge-info",k=R();return e.jsxs("div",{className:"test-analysis",children:[e.jsx("input",{type:"file",ref:d,onChange:_,accept:".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx",multiple:!0,style:{display:"none"}}),e.jsx("input",{type:"file",ref:C,onChange:Y,accept:".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx",multiple:!0,style:{display:"none"}}),e.jsxs("section",{className:"card ta-section",children:[e.jsxs("div",{className:"card-header",children:[e.jsxs("h3",{className:"card-title",children:[e.jsx(se,{size:18})," Test Coverage Gap Analysis"]}),e.jsxs("span",{className:"ta-doc-count",children:[k.length," parsed doc",k.length!==1?"s":""," in Document Hub"]})]}),e.jsxs("div",{className:"ta-upload-area",children:[e.jsx("p",{className:"ta-hint",children:"Upload your manually created test scenarios or test cases. AI will compare them against requirements from Document Hub to find coverage gaps."}),e.jsxs("div",{className:"ta-file-row",children:[e.jsxs("button",{className:"btn btn-primary",onClick:()=>d.current?.click(),children:[e.jsx($,{size:14})," Upload Test Files"]}),o.length>0&&e.jsxs("button",{className:"btn btn-sm btn-danger",onClick:()=>j([]),children:[e.jsx(U,{size:12})," Clear All"]})]}),o.length>0&&e.jsx("div",{className:"ta-file-list",children:o.map((s,a)=>e.jsxs("div",{className:"ta-file-chip",children:[e.jsx(q,{size:13}),e.jsx("span",{children:s.name}),e.jsx("button",{className:"ta-file-remove",onClick:()=>B(a),"aria-label":`Remove ${s.name}`,children:e.jsx(E,{size:12})})]},a))})]}),e.jsxs("div",{className:"ta-action-row",children:[e.jsxs("button",{className:"btn btn-primary",onClick:W,disabled:v||o.length===0,children:[e.jsx(ae,{size:14})," ",v?"Analyzing...":"Run AI Gap Analysis"]}),v&&e.jsx("div",{className:"ta-spinner"})]}),n&&e.jsxs("div",{className:"ta-results animate-in",children:[e.jsxs("div",{className:"ta-score-row",children:[e.jsxs("div",{className:"ta-score-circle",style:{borderColor:n.coverageScore>80?"var(--success)":n.coverageScore>50?"var(--warning)":"var(--danger)"},children:[e.jsxs("span",{className:"ta-score-value",style:{color:n.coverageScore>80?"var(--success)":n.coverageScore>50?"var(--warning)":"var(--danger)"},children:[n.coverageScore,"%"]}),e.jsx("span",{className:"ta-score-label",children:"Coverage"})]}),e.jsxs("div",{className:"ta-score-stats",children:[e.jsxs("div",{className:"ta-stat",children:[e.jsx("span",{className:"ta-stat-num",children:n.totalRequirements||0}),e.jsx("span",{className:"ta-stat-label",children:"Total Requirements"})]}),e.jsxs("div",{className:"ta-stat",children:[e.jsx("span",{className:"ta-stat-num",style:{color:"var(--success)"},children:n.coveredRequirements||0}),e.jsx("span",{className:"ta-stat-label",children:"Covered"})]}),e.jsxs("div",{className:"ta-stat",children:[e.jsx("span",{className:"ta-stat-num",style:{color:"var(--danger)"},children:(n.totalRequirements||0)-(n.coveredRequirements||0)}),e.jsx("span",{className:"ta-stat-label",children:"Gaps Found"})]}),e.jsxs("div",{className:"ta-stat",children:[e.jsx("span",{className:"ta-stat-num",style:{color:"var(--accent)"},children:(n.additionalTests||[]).length}),e.jsx("span",{className:"ta-stat-label",children:"Suggested Tests"})]})]})]}),n.summary&&e.jsx("p",{className:"ta-summary",children:n.summary}),(n.gaps||[]).length>0&&e.jsxs("div",{className:"ta-gap-list",children:[e.jsxs("h4",{className:"ta-sub-title",children:[e.jsx(te,{size:14})," Identified Gaps"]}),n.gaps.map(s=>e.jsxs("div",{className:"ta-gap-item",style:{borderLeftColor:G(s.severity)},children:[e.jsxs("div",{className:"ta-gap-header",onClick:()=>X(s.id),children:[e.jsxs("div",{className:"ta-gap-left",children:[e.jsx("span",{className:"ta-gap-id",children:s.id}),e.jsx("span",{className:`badge ${b(s.severity)}`,children:s.severity}),e.jsx("span",{className:"ta-gap-req",children:s.requirement})]}),A[s.id]?e.jsx(L,{size:14}):e.jsx(I,{size:14})]}),A[s.id]&&e.jsxs("div",{className:"ta-gap-body animate-in",children:[e.jsx("p",{className:"ta-gap-desc",children:s.description}),(s.suggestedTests||[]).length>0&&e.jsxs("div",{className:"ta-suggested",children:[e.jsxs("span",{className:"ta-suggested-label",children:[e.jsx(O,{size:12})," Suggested Tests:"]}),e.jsx("ul",{children:s.suggestedTests.map((a,i)=>e.jsx("li",{children:a},i))})]})]})]},s.id))]}),(n.additionalTests||[]).length>0&&e.jsxs("div",{className:"ta-additional",children:[e.jsxs("h4",{className:"ta-sub-title",children:[e.jsx(O,{size:14})," Recommended Additional Tests"]}),e.jsx("div",{className:"ta-additional-grid",children:n.additionalTests.map(s=>e.jsxs("div",{className:"ta-additional-card",children:[e.jsxs("div",{className:"ta-additional-header",children:[e.jsx("span",{className:"ta-additional-id",children:s.id}),e.jsx("span",{className:`badge ${b(s.priority)}`,children:s.priority})]}),e.jsx("h5",{className:"ta-additional-title",children:s.title}),e.jsx("p",{className:"ta-additional-desc",children:s.description}),s.coversGap&&e.jsxs("span",{className:"ta-covers-gap",children:["Covers: ",s.coversGap]})]},s.id))})]})]})]}),e.jsxs("section",{className:"card ta-section",style:{marginTop:"1.5rem"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{className:"card-title",children:[e.jsx(ce,{size:18})," Duplicate Test Detector"]})}),e.jsxs("div",{className:"ta-upload-area",children:[e.jsx("p",{className:"ta-hint",children:"Upload test case files to detect exact duplicates, near-duplicates, and overlapping test coverage across your test suite."}),e.jsxs("div",{className:"ta-file-row",children:[e.jsxs("button",{className:"btn btn-primary",onClick:()=>C.current?.click(),children:[e.jsx($,{size:14})," Upload Test Cases"]}),m.length>0&&e.jsxs("button",{className:"btn btn-sm btn-danger",onClick:()=>N([]),children:[e.jsx(U,{size:12})," Clear All"]})]}),m.length>0&&e.jsx("div",{className:"ta-file-list",children:m.map((s,a)=>e.jsxs("div",{className:"ta-file-chip",children:[e.jsx(q,{size:13}),e.jsx("span",{children:s.name}),e.jsx("button",{className:"ta-file-remove",onClick:()=>Q(a),"aria-label":`Remove ${s.name}`,children:e.jsx(E,{size:12})})]},a))})]}),e.jsxs("div",{className:"ta-action-row",children:[e.jsxs("button",{className:"btn btn-primary",onClick:V,disabled:y||m.length===0,children:[e.jsx(ne,{size:14})," ",y?"Scanning...":"Detect Duplicates"]}),y&&e.jsx("div",{className:"ta-spinner"})]}),l&&e.jsxs("div",{className:"ta-results animate-in",children:[e.jsxs("div",{className:"ta-dup-stats-row",children:[e.jsxs("div",{className:"ta-dup-stat",children:[e.jsx("span",{className:"ta-dup-stat-num",children:l.totalTestCases||0}),e.jsx("span",{className:"ta-dup-stat-label",children:"Total Tests"})]}),e.jsxs("div",{className:"ta-dup-stat",children:[e.jsx("span",{className:"ta-dup-stat-num",style:{color:"var(--danger)"},children:l.stats?.exact||0}),e.jsx("span",{className:"ta-dup-stat-label",children:"Exact Duplicates"})]}),e.jsxs("div",{className:"ta-dup-stat",children:[e.jsx("span",{className:"ta-dup-stat-num",style:{color:"var(--warning)"},children:l.stats?.near||0}),e.jsx("span",{className:"ta-dup-stat-label",children:"Near Duplicates"})]}),e.jsxs("div",{className:"ta-dup-stat",children:[e.jsx("span",{className:"ta-dup-stat-num",style:{color:"var(--info)"},children:l.stats?.overlap||0}),e.jsx("span",{className:"ta-dup-stat-label",children:"Overlapping"})]}),(l.stats?.savingsPercent||0)>0&&e.jsxs("div",{className:"ta-dup-stat",children:[e.jsxs("span",{className:"ta-dup-stat-num",style:{color:"var(--success)"},children:[l.stats.savingsPercent,"%"]}),e.jsx("span",{className:"ta-dup-stat-label",children:"Potential Savings"})]})]}),l.summary&&e.jsx("p",{className:"ta-summary",children:l.summary}),(l.duplicateGroups||[]).length>0&&e.jsx("div",{className:"ta-dup-list",children:l.duplicateGroups.map(s=>e.jsxs("div",{className:"ta-dup-item",style:{borderLeftColor:G(s.severity)},children:[e.jsxs("div",{className:"ta-dup-header",onClick:()=>K(s.id),children:[e.jsxs("div",{className:"ta-gap-left",children:[e.jsx("span",{className:"ta-gap-id",children:s.id}),e.jsx("span",{className:`badge ${b(s.severity)}`,children:s.severity}),e.jsx("span",{className:`badge badge-${s.recommendation==="remove"?"danger":s.recommendation==="merge"?"warning":"success"}`,children:s.recommendation})]}),w[s.id]?e.jsx(L,{size:14}):e.jsx(I,{size:14})]}),w[s.id]&&e.jsxs("div",{className:"ta-dup-body animate-in",children:[e.jsx("p",{className:"ta-gap-desc",children:s.reason}),e.jsx("div",{className:"ta-dup-tests",children:(s.tests||[]).map((a,i)=>e.jsxs("div",{className:"ta-dup-test-chip",children:[e.jsx(ie,{size:11})," ",a]},i))})]})]},s.id))}),(l.duplicateGroups||[]).length===0&&e.jsxs("div",{className:"ta-empty-state",children:[e.jsx(le,{size:24,style:{color:"var(--success)"}}),e.jsx("p",{children:"No duplicates detected — your test suite looks clean."})]})]})]})]})}export{he as default};
