<script lang="ts">
  import { graphql } from '$houdini';

  const store = graphql(`
    query fetching_route_1 {
      user(id: 1, snapshot: "fetching_route_1", delay: 200) {
        id
        name
      }
    }
  `);
</script>

<a href="./route_2">route_2</a>

<pre>{JSON.stringify($store, null, 2)}</pre>
