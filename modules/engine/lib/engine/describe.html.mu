<div class="describe-table">
  <h2>Table: {{name}}</h2>
    <div class="comments">{{{comments}}}</div>

{{#statements}}
  <h3 class="desc-statement">Statement: {{type}}</h3>
    <p>When you <code>select</code> from this table, ql.io will send the following type of HTTP
    request to the resource.</p>

    <pre>{{method}} {{uri}}
{{#headers}}
{{name}}: {{value}}
{{/headers}}
{{#body}}Content-Type: {{type}}
&nbsp;
{{content}}
    {{/body}}</pre>

    <p>You can include the following parameters in the where clause. In addition to these, you may
    need to supply parameters encoded within double curly braces (<code>{{</code> <code>}}</code> in
    the body (if there is one) of the request above.</p>

    <table class="desc-table">
        <thead>
        <tr>
            <td>name</td>
            <td>required</td>
            <td>default</td>
        </tr>
        </thead>
        <tbody>
        {{#params}}
        <tr>
            <td>{{variable}}</td>
            <td>{{required}}</td>
            <td>{{defautl}}</td>
        </tr>
        {{/params}}
        </tbody>
    </table>
{{/statements}}
</div>
