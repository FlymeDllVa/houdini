<script lang="ts">
  import { paginatedFragment, graphql } from '$houdini';

  const queryResult = graphql(`
    query UserFragmentForwardsCursorQuery {
      user(id: "1", snapshot: "pagination-fragment-forwards-cursor") {
        ...ForwardsCursorFragment
      }
    }
  `);

  const fragmentResult = paginatedFragment(
    $queryResult.data?.user ?? null,
    graphql(`
      fragment ForwardsCursorFragment on User {
        friendsConnection(first: 2) @paginate {
          edges {
            node {
              name
            }
          }
        }
      }
    `)
  );
</script>

<div id="result">
  {$fragmentResult?.data?.friendsConnection.edges.map(({ node }) => node?.name).join(', ')}
</div>

<div id="pageInfo">
  {JSON.stringify($fragmentResult?.pageInfo)}
</div>

<button id="next" on:click={() => fragmentResult?.loadNextPage()}>next</button>
