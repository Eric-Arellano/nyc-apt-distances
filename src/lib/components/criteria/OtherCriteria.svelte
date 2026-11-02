<script lang="ts">
import Card from '../Card.svelte';
import CriteriaSection from './CriteriaSection.svelte';
</script>

<Card title="Other criteria">
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
    <div class="space-y-6">
      <CriteriaSection title="Important">
        <li>
          Large enough for these things:
          <ul class="mt-1 list-disc space-y-1 pl-5">
            <li>Queen bed</li>
            <li>Desk</li>
            <li>Couch</li>
            <li>Small kitchen table</li>
            <li>Wall-mounted TV</li>
            <li>Cat tree and litter box</li>
            <li>Folding bike</li>
          </ul>
        </li>
        <li>The fridge is bigger than a mini fridge</li>
        <li>No basement unit</li>
      </CriteriaSection>
      <CriteriaSection title="Nice to have">
        <li>Can fit office in the bedroom (vs living room)</li>
        <li>Feels spacious</li>
        <li>Good natural light</li>
        <li>In-building laundry or in-unit laundry</li>
        <li>Built-in space for microwave</li>
        <li>Nice view</li>
        <li>Roof garden or balcony</li>
        <li>Gym</li>
      </CriteriaSection>
    </div>

    <div class="space-y-6">
      <CriteriaSection title="Not worth the money">
        <li>Lots of closet space</li>
        <li>2 bedrooms</li>
        <li>Central HVAC</li>
        <li>Dishwasher</li>
        <li>Doorman</li>
        <li>Elevator (vs walkup)</li>
        <li>Bike room</li>
        <li>Fancy kitchen appliances, since I use my own like a stove replacement</li>
        <li>Trendy neighborhood</li>
      </CriteriaSection>
      <CriteriaSection title="Actively dislike">
        <li>Noisy neighborhood / lots of nightlife</li>
      </CriteriaSection>
    </div>
  </div>
</Card>
